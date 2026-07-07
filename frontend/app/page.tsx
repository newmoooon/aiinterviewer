"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PROBLEMS } from "@/lib/problems";
import { HISTORY_KEY, type HistoryEntry } from "@/lib/types";

const DURATIONS = [30, 45, 60];

const DIFF_STYLE: Record<string, string> = {
  Easy: "text-good border-good/40 bg-good/10",
  Medium: "text-warn border-warn/40 bg-warn/10",
  Hard: "text-critical border-critical/40 bg-critical/10",
};

export default function Home() {
  const router = useRouter();
  const [problemId, setProblemId] = useState(PROBLEMS[0].id);
  const [duration, setDuration] = useState(45);
  const [starting, setStarting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"));
    } catch {
      // corrupted or unavailable storage — start fresh
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const start = () => {
    setStarting(true);
    router.push(`/interview?problem=${problemId}&duration=${duration}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-14">
      <header className="mb-12">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-accent">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          INTERVIEWLAB
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          Practice a live technical interview
          <br />
          <span className="text-sub">with an AI interviewer that watches, listens, and talks back.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sub">
          Alex — your AI interviewer — reads your code as you type, listens to your
          reasoning over voice, asks follow-up questions, nudges you when you stall,
          and delivers a hire/no-hire packet when time runs out.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          1 · Choose your problem
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROBLEMS.map((p) => {
            const selected = p.id === problemId;
            return (
              <button
                key={p.id}
                onClick={() => setProblemId(p.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-accent bg-accent/10 ring-1 ring-accent"
                    : "border-hairline bg-surface hover:border-muted"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.title}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${DIFF_STYLE[p.difficulty]}`}
                  >
                    {p.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-raised px-1.5 py-0.5 text-xs text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
          2 · Set the clock
        </h2>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-all ${
                duration === d
                  ? "border-accent bg-accent text-white"
                  : "border-hairline bg-surface text-sub hover:border-muted"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </section>

      <section>
        <button
          onClick={start}
          disabled={starting}
          className="w-full rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-accentDeep disabled:opacity-60 sm:w-auto sm:px-12"
        >
          {starting ? "Setting up your room…" : "Start interview →"}
        </button>
        <p className="mt-4 text-sm text-muted">
          🎙️ Your browser will ask for microphone access — the interview is fully
          voice-driven. Audio and code stream straight through WebRTC to the AI and
          are never stored.
        </p>
      </section>

      {history.length > 0 && (
        <section className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Past interviews{" "}
              <span className="font-normal normal-case">
                (saved on this device only)
              </span>
            </h2>
            <button
              onClick={clearHistory}
              className="text-xs text-muted underline-offset-2 hover:text-sub hover:underline"
            >
              Clear history
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {history.map((h) => {
              const hired = h.report.decision === "HIRE";
              return (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-hairline bg-surface px-4 py-3"
                >
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                      hired
                        ? "border-good/50 bg-good/15 text-good"
                        : "border-critical/50 bg-critical/15 text-critical"
                    }`}
                  >
                    {hired ? "HIRE" : "NO HIRE"}
                  </span>
                  <span className="font-medium">{h.problemTitle}</span>
                  <span className="text-sm text-muted">
                    {new Date(h.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {h.durationMin} min
                  </span>
                  <span className="ml-auto flex items-center gap-3 font-mono text-sm tabular-nums text-sub">
                    <span title="Coding score">
                      <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent" />
                      {h.report.codingScore}
                    </span>
                    <span title="Communication score">
                      <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-aqua" />
                      {h.report.communicationScore}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
