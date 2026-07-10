"use client";

import type { TestRunSummary } from "@/lib/judge";
import type { RunStatus } from "@/lib/run-code";

/**
 * Judge results drawer under the editor: one row per test case with the
 * expected/actual pair, runtime, and any error — the same feedback loop a
 * real coding platform gives, so the interview pressure includes red tests.
 */
export default function TestPanel({
  summary,
  running,
  status,
}: {
  summary: TestRunSummary | null;
  running: boolean;
  status: RunStatus | null;
}) {
  if (running) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-xs text-sub">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-line border-t-accent" />
        {status === "loading-runtime"
          ? "Downloading the Python runtime (first run only, ~10 MB)…"
          : "Running your code against the test cases…"}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="px-4 py-3 text-xs text-muted">
        Run the test cases any time — Alex sees your results too.
      </div>
    );
  }

  if (summary.setupError) {
    return (
      <div className="space-y-1 px-4 py-3">
        <p className="text-xs font-semibold text-critical">Couldn&apos;t run your code</p>
        <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-sub">
          {summary.setupError}
        </pre>
      </div>
    );
  }

  const allPass = summary.passed === summary.total;

  return (
    <div className="space-y-2 px-4 py-3">
      <p
        className={`text-xs font-semibold ${allPass ? "text-good" : "text-critical"}`}
      >
        {summary.passed}/{summary.total} test cases passed
      </p>
      <ul className="space-y-1.5">
        {summary.cases.map((c, index) => (
          <li key={index} className="rounded-md border border-hairline bg-raised/50 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-xs text-sub" title={c.label}>
                <span className={c.pass ? "text-good" : "text-critical"}>
                  {c.pass ? "✓" : "✗"}
                </span>{" "}
                {c.label}
              </span>
              <span className="shrink-0 text-[10px] text-muted">{c.timeMs}ms</span>
            </div>
            {!c.pass && (
              <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                {c.error ? (
                  <p className="whitespace-pre-wrap text-critical">{c.error}</p>
                ) : (
                  <>
                    <p className="text-muted">
                      expected <span className="text-sub">{c.expected}</span>
                    </p>
                    <p className="text-muted">
                      got <span className="text-critical">{c.got}</span>
                    </p>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
