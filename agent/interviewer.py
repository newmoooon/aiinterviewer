"""Real-time AI technical interviewer — LiveKit Agents worker.

Pipeline: candidate mic/screen  ─▶ LiveKit WebRTC ─▶ Gemini Multimodal Live API
          candidate editor text ─▶ LiveKit data channel ─▶ this worker ─▶ Gemini

Nothing is written to disk: audio, video and code snapshots live only in memory
for the duration of the room, and the API key stays in server-side env vars.

Run locally:  python interviewer.py dev
"""

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field

from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.plugins import google

import prompts
from problems import get_problem

load_dotenv()

logger = logging.getLogger("ai-interviewer")
logger.setLevel(logging.INFO)

# Free-tier friendly defaults; override in .env if Google renames the model.
LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest")
REPORT_MODEL = os.getenv("GEMINI_REPORT_MODEL", "gemini-2.5-flash")
VOICE = os.getenv("GEMINI_VOICE", "Puck")

SILENCE_THRESHOLD_S = 15.0  # stuck flow: nudge after 15s of no voice + no typing
TEST_REACTION_COOLDOWN_S = 20.0  # min gap between spoken reactions to test runs
SILENCE_COOLDOWN_S = 30.0  # don't nudge again within 30s
REVIEW_INTERVAL_S = 30.0  # how often we consider a proactive code review
INTERJECTION_COOLDOWN_S = 45.0  # min gap between unprompted interjections
SPEECH_SETTLE_S = 4.0  # never interject within 4s of anyone speaking
WATCH_TICK_S = 2.0


@dataclass
class InterviewState:
    code: str = ""
    language: str = "python"
    code_at_last_review: str = ""
    started_at: float = field(default_factory=time.monotonic)
    last_code_change: float = field(default_factory=time.monotonic)
    last_user_speech: float = field(default_factory=time.monotonic)
    last_agent_speech: float = field(default_factory=time.monotonic)
    last_nudge: float = field(default_factory=time.monotonic)
    last_review: float = field(default_factory=time.monotonic)
    last_interjection: float = field(default_factory=time.monotonic)
    hints_used: int = 0
    ended: bool = False
    last_test_run: dict | None = None
    test_runs: int = 0
    last_test_reaction: float = 0.0


def numbered(code: str) -> str:
    """Line-numbered snapshot so the model can reference exact lines aloud."""
    if not code.strip():
        return "(the editor is currently empty)"
    lines = code.splitlines()
    return "\n".join(f"{i + 1:>3}| {line}" for i, line in enumerate(lines))


def format_test_run(run: dict | None, total_runs: int = 0) -> str:
    """Human-readable digest of the candidate's latest judge run."""
    if not run:
        return "The candidate never ran the built-in test cases."
    if run.get("setupError"):
        return (
            f"Latest test run (run #{total_runs}) could not execute the code: "
            f"{run['setupError']}"
        )
    lines = [
        f"Latest test run (run #{total_runs}, {run.get('language', '?')}): "
        f"{run.get('passed', 0)}/{run.get('total', 0)} cases passed."
    ]
    for failure in (run.get("failures") or [])[:4]:
        label = failure.get("label", "?")
        if failure.get("error"):
            lines.append(f"- FAILED {label}: raised {failure['error']}")
        else:
            lines.append(
                f"- FAILED {label}: expected {failure.get('expected')}, "
                f"got {failure.get('got')}"
            )
    return "\n".join(lines)


def significant_change(old: str, new: str) -> bool:
    """Cheap heuristic for 'a logical block just landed'."""
    if abs(len(new) - len(old)) > 80:
        return True
    return abs(new.count("\n") - old.count("\n")) >= 3


def format_transcript(history) -> str:
    lines: list[str] = []
    for item in getattr(history, "items", []):
        if getattr(item, "type", "") != "message":
            continue
        text = getattr(item, "text_content", None) or ""
        if not text.strip() or text.startswith("[SYSTEM EVENT]"):
            continue
        role = getattr(item, "role", "")
        speaker = "Interviewer" if role == "assistant" else "Candidate"
        lines.append(f"{speaker}: {text.strip()}")
    return "\n".join(lines)


class Interviewer(Agent):
    def __init__(self, state: InterviewState, problem: dict, duration_min: int):
        self._state = state
        super().__init__(instructions=prompts.build_instructions(problem, duration_min))

    @function_tool
    async def read_editor(self, context: RunContext) -> str:
        """Read the candidate's current code editor contents, with line numbers.

        Call this before commenting on specifics of the candidate's code and
        before giving any hint, so your feedback matches what is on screen.
        """
        return (
            f"Editor language: {self._state.language}\n"
            f"{numbered(self._state.code)}\n\n"
            f"{format_test_run(self._state.last_test_run, self._state.test_runs)}"
        )

    @function_tool
    async def log_hint(self, context: RunContext) -> str:
        """Record that you just gave the candidate a hint. Call this once per hint."""
        self._state.hints_used += 1
        return f"Recorded. Total hints so far: {self._state.hints_used}."


def _fallback_report(state: InterviewState, note: str) -> dict:
    return {
        "codingScore": 0,
        "communicationScore": 0,
        "decision": "NO_HIRE",
        "summary": (
            "The automatic evaluation could not be completed: "
            f"{note}. Your session ran end-to-end, but no scores were produced — "
            "please check the agent logs and your GOOGLE_API_KEY, then try again."
        ),
        "codingFeedback": {"strengths": [], "improvements": []},
        "communicationFeedback": {"strengths": [], "improvements": []},
        "hintsUsed": state.hints_used,
        "error": True,
    }


def _generate_report_sync(prompt: str) -> dict:
    from google import genai

    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    resp = client.models.generate_content(
        model=REPORT_MODEL,
        contents=prompt,
        config={"response_mime_type": "application/json", "temperature": 0.3},
    )
    text = (resp.text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{") :]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"model returned non-JSON report: {text[:200]!r}")
    return json.loads(text[start : end + 1])


def _sanitize_report(raw: dict, state: InterviewState) -> dict:
    def clamp(v) -> int:
        try:
            return max(0, min(100, int(v)))
        except (TypeError, ValueError):
            return 0

    def str_list(v) -> list[str]:
        return [str(x) for x in v][:4] if isinstance(v, list) else []

    def feedback(v) -> dict:
        v = v if isinstance(v, dict) else {}
        return {
            "strengths": str_list(v.get("strengths")),
            "improvements": str_list(v.get("improvements")),
        }

    return {
        "codingScore": clamp(raw.get("codingScore")),
        "communicationScore": clamp(raw.get("communicationScore")),
        "decision": "HIRE" if raw.get("decision") == "HIRE" else "NO_HIRE",
        "summary": str(raw.get("summary", "")),
        "codingFeedback": feedback(raw.get("codingFeedback")),
        "communicationFeedback": feedback(raw.get("communicationFeedback")),
        "hintsUsed": state.hints_used,
    }


async def watch_loop(session: AgentSession, state: InterviewState) -> None:
    """Drives the 'stuck' flow and the proactive live code review."""
    while not state.ended:
        await asyncio.sleep(WATCH_TICK_S)
        if state.ended:
            return
        now = time.monotonic()

        try:
            agent_busy = str(session.agent_state) in ("speaking", "thinking")
            user_talking = str(session.user_state) == "speaking"
        except Exception:
            agent_busy = user_talking = False
        if agent_busy or user_talking:
            continue

        idle = now - max(state.last_user_speech, state.last_code_change, state.last_agent_speech)
        speech_gap = now - max(state.last_user_speech, state.last_agent_speech)

        try:
            # Flow 2 — stuck: no voice AND no typing for 15s.
            if idle >= SILENCE_THRESHOLD_S and now - state.last_nudge >= SILENCE_COOLDOWN_S:
                state.last_nudge = now
                state.last_interjection = now
                logger.info("silence nudge (idle %.1fs)", idle)
                session.generate_reply(instructions=prompts.silence_nudge(numbered(state.code)))
                continue

            # Flow 1 — smooth sailing: review new code between logical blocks.
            if (
                now - state.last_review >= REVIEW_INTERVAL_S
                and now - state.last_interjection >= INTERJECTION_COOLDOWN_S
                and speech_gap >= SPEECH_SETTLE_S
                and significant_change(state.code_at_last_review, state.code)
            ):
                state.last_review = now
                state.last_interjection = now
                state.code_at_last_review = state.code
                logger.info("proactive code review")
                session.generate_reply(instructions=prompts.proactive_review(numbered(state.code)))
        except Exception:
            logger.exception("watch loop interjection failed")


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    participant = await ctx.wait_for_participant()

    meta: dict = {}
    try:
        meta = json.loads(participant.metadata or "{}")
    except json.JSONDecodeError:
        logger.warning("unparseable participant metadata: %r", participant.metadata)

    problem = get_problem(meta.get("problemId"))
    try:
        duration_min = max(10, min(90, int(meta.get("durationMin") or 45)))
    except (TypeError, ValueError):
        duration_min = 45

    logger.info(
        "starting interview: room=%s problem=%s duration=%dmin",
        ctx.room.name, problem["id"], duration_min,
    )

    state = InterviewState()
    session = AgentSession(
        llm=google.beta.realtime.RealtimeModel(
            model=LIVE_MODEL,
            voice=VOICE,
            temperature=0.7,
        ),
    )

    @session.on("user_input_transcribed")
    def _on_user_speech(ev) -> None:
        state.last_user_speech = time.monotonic()

    @session.on("agent_state_changed")
    def _on_agent_state(ev) -> None:
        if str(getattr(ev, "new_state", "")) == "speaking":
            state.last_agent_speech = time.monotonic()

    async def finish_interview(reason: str) -> None:
        if state.ended:
            return
        state.ended = True
        logger.info("finishing interview (%s)", reason)

        # Verbal wrap-up before the written packet.
        try:
            handle = session.generate_reply(instructions=prompts.wrap_up(reason))
            wait = getattr(handle, "wait_for_playout", None)
            if wait is not None:
                await asyncio.wait_for(wait(), timeout=25)
            else:
                await asyncio.sleep(8)
        except Exception:
            logger.exception("wrap-up speech failed; continuing to report")

        elapsed_min = (time.monotonic() - state.started_at) / 60
        prompt = prompts.report_prompt(
            problem=problem,
            transcript=format_transcript(session.history),
            final_code=state.code,
            language=state.language,
            hints_used=state.hints_used,
            duration_min=duration_min,
            elapsed_min=elapsed_min,
            test_summary=format_test_run(state.last_test_run, state.test_runs),
        )
        try:
            raw = await asyncio.to_thread(_generate_report_sync, prompt)
            report = _sanitize_report(raw, state)
        except Exception as exc:
            logger.exception("report generation failed")
            report = _fallback_report(state, str(exc))

        try:
            await ctx.room.local_participant.publish_data(
                json.dumps(report).encode("utf-8"), reliable=True, topic="report"
            )
            logger.info(
                "report delivered: coding=%s comms=%s decision=%s",
                report["codingScore"], report["communicationScore"], report["decision"],
            )
        except Exception:
            logger.exception("failed to publish report")

    def on_data(packet: rtc.DataPacket) -> None:
        try:
            payload = json.loads(packet.data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return

        if packet.topic == "code_update":
            new_code = payload.get("code", "")
            if new_code != state.code:
                state.last_code_change = time.monotonic()
            state.code = new_code
            state.language = payload.get("language", state.language)
        elif packet.topic == "test_results":
            state.last_test_run = payload
            state.test_runs += 1
            now = time.monotonic()
            if state.ended or now - state.last_test_reaction < TEST_REACTION_COOLDOWN_S:
                return
            state.last_test_reaction = now
            state.last_interjection = now  # keep the watch loop from double-firing
            all_passed = (
                not payload.get("setupError")
                and payload.get("total", 0) > 0
                and payload.get("passed", -1) == payload.get("total", 0)
            )
            summary = format_test_run(payload, state.test_runs)
            logger.info("test run: %s", summary.splitlines()[0])
            session.generate_reply(
                instructions=prompts.test_results_reaction(summary, all_passed)
            )
        elif packet.topic == "control":
            kind = payload.get("type")
            if kind == "time_warning" and not state.ended:
                minutes = max(1, round(int(payload.get("remainingSeconds", 300)) / 60))
                session.generate_reply(instructions=prompts.time_warning(minutes))
            elif kind == "end_interview":
                # Final editor state rides along with the end signal.
                if payload.get("code") is not None:
                    state.code = payload["code"]
                    state.language = payload.get("language", state.language)
                asyncio.create_task(finish_interview(payload.get("reason", "candidate_ended")))

    ctx.room.on("data_received", on_data)

    await session.start(
        agent=Interviewer(state, problem, duration_min),
        room=ctx.room,
        # video_enabled lets Gemini also watch an optional screen share track;
        # media is relayed straight through — never cached or written to disk.
        room_input_options=RoomInputOptions(video_enabled=True),
    )

    session.generate_reply(instructions=prompts.greeting())
    asyncio.create_task(watch_loop(session, state))


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
