"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarVisualizer,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useVoiceAssistant,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import type { Language, Problem } from "@/lib/problems";
import {
  HISTORY_KEY,
  TOPIC_CODE_UPDATE,
  TOPIC_CONTROL,
  TOPIC_REPORT,
  TOPIC_TRANSCRIPTION,
  type HistoryEntry,
  type Report,
  type TranscriptSegment,
} from "@/lib/types";
import EditorPanel from "./EditorPanel";
import ProblemPanel from "./ProblemPanel";
import ReportModal from "./ReportModal";
import Timer from "./Timer";
import TranscriptPanel from "./TranscriptPanel";

type Phase = "live" | "ending" | "report";

const AGENT_LABEL: Record<string, string> = {
  disconnected: "Offline",
  connecting: "Connecting…",
  initializing: "Warming up…",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
};

export default function InterviewRoom({
  problem,
  durationMin,
}: {
  problem: Problem;
  durationMin: number;
}) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const connected = connectionState === ConnectionState.Connected;
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const { state: agentState, audioTrack, agent } = useVoiceAssistant();

  const [remaining, setRemaining] = useState(durationMin * 60);
  const [phase, setPhase] = useState<Phase>("live");
  const [report, setReport] = useState<Report | null>(null);
  const [reportTimedOut, setReportTimedOut] = useState(false);
  const [leftTab, setLeftTab] = useState<"problem" | "transcript">("problem");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [unseenSpeech, setUnseenSpeech] = useState(false);

  const warnedRef = useRef(false);
  const endedRef = useRef(false);
  const codeRef = useRef<{ code: string; language: Language }>({
    code: problem.starterCode.python,
    language: "python",
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publish = useCallback(
    async (topic: string, payload: unknown) => {
      try {
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify(payload)),
          { reliable: true, topic },
        );
      } catch (err) {
        console.error(`failed to publish ${topic}`, err);
      }
    },
    [room],
  );

  const endInterview = useCallback(
    (reason: "candidate_ended" | "time_up") => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase("ending");
      void publish(TOPIC_CONTROL, {
        type: "end_interview",
        reason,
        code: codeRef.current.code,
        language: codeRef.current.language,
      });
    },
    [publish],
  );

  // Countdown — starts once connected, stops when the interview ends.
  useEffect(() => {
    if (!connected || phase !== "live") return;
    const iv = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(iv);
  }, [connected, phase]);

  // Timer milestones: 5-minute verbal warning, auto-end at zero.
  useEffect(() => {
    if (!connected || phase !== "live") return;
    if (remaining <= 300 && remaining > 0 && !warnedRef.current) {
      warnedRef.current = true;
      void publish(TOPIC_CONTROL, {
        type: "time_warning",
        remainingSeconds: remaining,
      });
    }
    if (remaining === 0) endInterview("time_up");
  }, [remaining, connected, phase, publish, endInterview]);

  // Seed the agent with the starter code as soon as we're in the room.
  useEffect(() => {
    if (connected) {
      void publish(TOPIC_CODE_UPDATE, {
        code: codeRef.current.code,
        language: codeRef.current.language,
      });
    }
  }, [connected, publish]);

  // Live transcript: LiveKit streams every utterance (yours and Alex's) as
  // text on the built-in transcription topic.
  useEffect(() => {
    const r = room as unknown as {
      registerTextStreamHandler?: (
        topic: string,
        cb: (reader: AsyncIterable<string> & { info?: { id?: string; attributes?: Record<string, string> } }, participant?: { identity?: string }) => void,
      ) => void;
      unregisterTextStreamHandler?: (topic: string) => void;
    };
    if (!r.registerTextStreamHandler) return;

    try {
      r.registerTextStreamHandler(TOPIC_TRANSCRIPTION, async (reader, participant) => {
        const attrs = reader.info?.attributes ?? {};
        const id =
          attrs["lk.segment_id"] ?? reader.info?.id ?? Math.random().toString(36).slice(2);
        const speaker: TranscriptSegment["speaker"] =
          participant?.identity === room.localParticipant.identity ? "you" : "interviewer";
        let text = "";
        try {
          for await (const chunk of reader) {
            text += chunk;
            const snapshot = text;
            setSegments((prev) => {
              const idx = prev.findIndex((s) => s.id === id);
              const seg: TranscriptSegment = {
                id,
                speaker,
                text: snapshot,
                final: attrs["lk.transcription_final"] === "true",
                at: Date.now(),
              };
              if (idx === -1) return [...prev, seg];
              const next = prev.slice();
              next[idx] = { ...next[idx], text: snapshot, final: seg.final };
              return next;
            });
          }
        } catch {
          // stream aborted mid-utterance — keep what we have
        }
        if (speaker === "interviewer") setUnseenSpeech(true);
      });
    } catch {
      // another handler already registered — transcript just won't render
    }
    return () => {
      try {
        r.unregisterTextStreamHandler?.(TOPIC_TRANSCRIPTION);
      } catch {}
    };
  }, [room]);

  // Receive the performance report from the agent.
  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic !== TOPIC_REPORT) return;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as Report;
        setReport(parsed);
        setPhase("report");
        // Persist to this device's interview history (localStorage only —
        // nothing leaves the browser).
        try {
          const entry: HistoryEntry = {
            id: Math.random().toString(36).slice(2, 10),
            date: new Date().toISOString(),
            problemId: problem.id,
            problemTitle: problem.title,
            durationMin,
            report: parsed,
          };
          const prev: HistoryEntry[] = JSON.parse(
            localStorage.getItem(HISTORY_KEY) ?? "[]",
          );
          localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify([entry, ...prev].slice(0, 20)),
          );
        } catch {
          // private browsing / quota — history is best-effort
        }
      } catch (err) {
        console.error("unparseable report payload", err);
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  // Mute the mic while the report is being written / shown.
  useEffect(() => {
    if (phase === "report") {
      void localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
  }, [phase, localParticipant]);

  // If the report never arrives, don't leave the user stranded.
  useEffect(() => {
    if (phase !== "ending") return;
    const t = setTimeout(() => setReportTimedOut(true), 60_000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleCodeChange = useCallback(
    (code: string, language: Language) => {
      codeRef.current = { code, language };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void publish(TOPIC_CODE_UPDATE, { code, language, at: Date.now() });
      }, 700);
    },
    [publish],
  );

  const leave = useCallback(() => {
    void room.disconnect();
  }, [room]);

  const agentReady = Boolean(agent);

  return (
    <div className="flex h-screen flex-col bg-page">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-hairline bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-accent">
            <span className="h-2 w-2 rounded-full bg-accent" />
            INTERVIEWLAB
          </span>
          <span className="hidden text-hairline sm:inline">|</span>
          <span className="hidden truncate text-sm text-sub sm:inline">
            {problem.title}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Interviewer status */}
          <div
            className={`flex items-center gap-2 rounded-full border border-hairline bg-raised px-3 py-1.5 ${
              agentReady ? "" : "animate-pulse-soft"
            }`}
            title="AI interviewer status"
          >
            <BarVisualizer
              state={agentState}
              trackRef={audioTrack}
              barCount={5}
              options={{ minHeight: 4 }}
              className="agent-viz"
            />
            <span className="text-xs font-medium text-sub">
              {agentReady
                ? (AGENT_LABEL[agentState] ?? "Alex")
                : "Waiting for interviewer…"}
            </span>
          </div>

          <Timer remaining={remaining} />

          {/* Mic toggle */}
          <button
            onClick={() =>
              void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
            }
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isMicrophoneEnabled
                ? "border-hairline bg-raised text-sub hover:border-muted"
                : "border-critical/50 bg-critical/15 text-critical"
            }`}
            title={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {isMicrophoneEnabled ? "🎙️ Mic on" : "🔇 Muted"}
          </button>

          {/* Optional screen share (lets Gemini literally watch the screen) */}
          <button
            onClick={() =>
              void localParticipant
                .setScreenShareEnabled(!isScreenShareEnabled)
                .catch(() => {})
            }
            className={`hidden rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:inline ${
              isScreenShareEnabled
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-hairline bg-raised text-sub hover:border-muted"
            }`}
            title="Optionally share your screen with the interviewer"
          >
            {isScreenShareEnabled ? "🖥️ Sharing" : "🖥️ Share screen"}
          </button>

          <button
            onClick={() => endInterview("candidate_ended")}
            disabled={phase !== "live"}
            className="rounded-full bg-critical px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            End interview
          </button>
        </div>
      </header>

      {/* ── Split workspace ────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(360px,42%)_1fr]">
        <div className="flex min-h-0 flex-col border-b border-hairline lg:border-b-0 lg:border-r">
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-hairline bg-surface px-3">
            <button
              onClick={() => setLeftTab("problem")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                leftTab === "problem" ? "bg-raised text-ink" : "text-muted hover:text-sub"
              }`}
            >
              Problem
            </button>
            <button
              onClick={() => {
                setLeftTab("transcript");
                setUnseenSpeech(false);
              }}
              className={`relative rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                leftTab === "transcript" ? "bg-raised text-ink" : "text-muted hover:text-sub"
              }`}
            >
              Transcript
              {unseenSpeech && leftTab !== "transcript" && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
              )}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {leftTab === "problem" ? (
              <ProblemPanel problem={problem} />
            ) : (
              <TranscriptPanel segments={segments} />
            )}
          </div>
        </div>
        <div className="min-h-0">
          <EditorPanel
            problem={problem}
            onCodeChange={handleCodeChange}
            disabled={phase !== "live"}
          />
        </div>
      </div>

      {/* ── Report generation overlay ──────────────────────────────────── */}
      {phase === "ending" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-page/90 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="text-lg font-semibold">
            Alex is writing up your evaluation…
          </p>
          <p className="text-sm text-sub">
            Scoring your code and communication — this takes a few seconds.
          </p>
          {reportTimedOut && (
            <button
              onClick={leave}
              className="mt-2 rounded-lg border border-hairline px-4 py-2 text-sm text-sub hover:border-muted"
            >
              Taking too long? Leave the room
            </button>
          )}
        </div>
      )}

      {phase === "report" && report && (
        <ReportModal
          report={report}
          problem={problem}
          finalCode={codeRef.current.code}
          language={codeRef.current.language}
          transcript={segments}
          onDone={leave}
        />
      )}
    </div>
  );
}
