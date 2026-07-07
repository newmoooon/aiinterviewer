"use client";

import type { Problem } from "@/lib/problems";

const DIFF_STYLE: Record<string, string> = {
  Easy: "text-good border-good/40 bg-good/10",
  Medium: "text-warn border-warn/40 bg-warn/10",
  Hard: "text-critical border-critical/40 bg-critical/10",
};

export default function ProblemPanel({ problem }: { problem: Problem }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-xl font-bold">{problem.title}</h1>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${DIFF_STYLE[problem.difficulty]}`}
          >
            {problem.difficulty}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {problem.topics.map((t) => (
            <span
              key={t}
              className="rounded bg-raised px-1.5 py-0.5 text-xs text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3 text-[15px] leading-relaxed text-sub">
        {problem.statement.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="space-y-4">
        {problem.examples.map((ex, i) => (
          <div key={i}>
            <p className="mb-1.5 text-sm font-semibold">Example {i + 1}</p>
            <div className="overflow-x-auto rounded-lg border border-hairline bg-surface p-3 font-mono text-[13px] leading-relaxed">
              <p>
                <span className="text-muted">Input: </span>
                <span className="whitespace-pre-wrap">{ex.input}</span>
              </p>
              <p>
                <span className="text-muted">Output: </span>
                {ex.output}
              </p>
              {ex.explanation && (
                <p>
                  <span className="text-muted">Explanation: </span>
                  <span className="font-sans text-sub">{ex.explanation}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold">Constraints</p>
        <ul className="list-inside list-disc space-y-1 font-mono text-[13px] text-sub">
          {problem.constraints.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-sub">
        💬 <span className="font-medium text-ink">Think out loud.</span> Alex is
        listening to your voice and reading your editor in real time — narrate
        your approach like you would with a human interviewer, and say
        “can I get a hint?” if you need one.
      </div>
    </div>
  );
}
