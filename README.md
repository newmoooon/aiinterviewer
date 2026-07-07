# InterviewLab — Real-Time AI Technical Interviewer

[![CI](https://github.com/newmoooon/aiinterviewer/actions/workflows/ci.yml/badge.svg)](https://github.com/newmoooon/aiinterviewer/actions/workflows/ci.yml)

Practice live, high-pressure technical interviews with **Alex**, an AI interviewer
that reads your code as you type, listens to you think out loud, interrupts with
targeted engineering questions, nudges you when you stall, warns you at the
5-minute mark, and hands you a hire/no-hire scoring packet when time runs out.

**100% free-tier infrastructure — no credit card anywhere:**

| Layer | Service | Free tier |
|---|---|---|
| Real-time media (WebRTC) | [LiveKit Cloud](https://cloud.livekit.io) "Build" plan | 1,000 agent minutes/mo |
| Voice + vision intelligence | [Google AI Studio](https://aistudio.google.com) Gemini Live API | free native-audio realtime model |
| Report grading | Gemini 2.5 Flash (AI Studio) | free tier |
| Frontend | Next.js 14 (runs locally / any free host) | — |

## Architecture

```
┌──────────────────────────┐        WebRTC         ┌─────────────────────┐
│  Next.js frontend        │  mic audio + optional │  LiveKit Cloud      │
│  · Monaco editor         │  screen share ──────▶ │  (SFU, free tier)   │
│  · problem panel + timer │                       └──────────┬──────────┘
│  · report scoreboard     │   data channel                   │
│  /api/token (server-side │   code_update / control /        │
│   LiveKit token minting) │   report topics                  ▼
└──────────────────────────┘                       ┌─────────────────────┐
                                                   │  Python agent       │
                                                   │  (livekit-agents)   │
                                                   │  Gemini Live API ◀──┤ voice in/out,
                                                   │  native audio       │ barge-in, vision
                                                   │  Gemini 2.5 Flash ◀─┤ end-of-session
                                                   └─────────────────────┘ scoring packet
```

- The editor streams to the agent as structured text over LiveKit's encrypted
  data channel (token-cheaper and more reliable for code than raw pixels); an
  optional **Share screen** button additionally gives Gemini a live video view.
- **Nothing is stored.** Audio, video and code snapshots are relayed in memory
  only; API keys live exclusively in server-side env files.

## Setup (one time, ~5 minutes)

### 1. LiveKit Cloud
1. Sign up free at <https://cloud.livekit.io> and create a project.
2. Project **Settings → Keys → Create key**. Note the **WebSocket URL**
   (`wss://…livekit.cloud`), **API key**, and **API secret**.

### 2. Google AI Studio
1. Go to <https://aistudio.google.com/apikey> and create a free API key.

### 3. Configure env files
```bash
cp agent/.env.example agent/.env               # fill all 4 values
cp frontend/.env.example frontend/.env.local   # fill the 3 LiveKit values
```

### 4. Install
```bash
# agent
cd agent
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# frontend
cd ../frontend
npm install
```

## Run

Two terminals:

```bash
# 1 — the AI interviewer (joins every new interview room automatically)
cd agent && .venv/bin/python interviewer.py dev

# 2 — the web app
cd frontend && npm run dev
```

Open <http://localhost:3000>, pick a problem and a time limit, allow the mic,
and start talking. Say **"Can I get a hint?"** if you're stuck; hints are
counted against your communication score. Click **End interview** (or let the
clock hit 0:00) to receive your packet: coding score, communication score,
hire/no-hire decision, and specific improvement areas.

## Interviewer behavior (what to expect)

1. **Smooth sailing** — while you type and narrate, Alex stays quiet, silently
   evaluating your editor; it only interjects between logical blocks with one
   targeted question ("why a hash map over a plain array on line 12?").
2. **Stuck** — go silent *and* stop typing for 15 seconds and Alex steps in:
   "Walk me through what you're thinking right now."
3. **Follow-ups** — vague answers get one precise push-back on depth
   (complexity, unbalanced trees, edge cases).
4. **Hints** — never code, never the algorithm; a progressive conceptual clue
   anchored to the exact line you're stuck on.

Voice replies stay under three sentences, use natural fillers, never read code
aloud, and stop instantly when you interrupt (barge-in is native to Gemini Live).

## Config knobs

| Env var | Default | Meaning |
|---|---|---|
| `GEMINI_LIVE_MODEL` | `gemini-2.5-flash-native-audio-preview-09-2025` | realtime voice model (update if Google renames) |
| `GEMINI_REPORT_MODEL` | `gemini-2.5-flash` | grader that writes the report |
| `GEMINI_VOICE` | `Puck` | interviewer voice |

Timing rules (silence threshold, interjection cooldowns) are constants at the
top of `agent/interviewer.py`.

## Troubleshooting

- **"Waiting for interviewer…" never resolves** → the agent worker isn't
  running or points at a different LiveKit project. Start
  `python interviewer.py dev` with the same `LIVEKIT_URL`/keys.
- **No audio** → click the "enable interviewer audio" pill (browser autoplay
  policy), and check the mic pill isn't muted.
- **Report shows an error** → usually `GOOGLE_API_KEY` missing/invalid in
  `agent/.env`; the agent log will show the exact cause.
- **Model not found error from Gemini** → Google rotated the preview model id;
  set `GEMINI_LIVE_MODEL` in `agent/.env` to the current id listed at
  <https://ai.google.dev/gemini-api/docs/live>.
