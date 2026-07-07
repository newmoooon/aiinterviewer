"use client";

import type { Problem } from "@/lib/problems";
import type { FeedbackSection, Report } from "@/lib/types";

/* Score meter — stat tile with a thin 8px bar, 4px rounded data-end,
   validated dark-surface series hues (blue / aqua), text in ink tokens. */
function ScoreMeter({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-raised p-4">
      <div className="mb-1 flex items-center gap-2 text-sm text-sub">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm"
          style={{ background: color }}
        />
        {label}
      </div>
      <div className="mb-3 text-4xl font-bold text-ink">
        {score}
        <span className="text-lg font-medium text-muted"> / 100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-line">
        <div
          className="meter-fill h-2 rounded-full"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

function FeedbackList({
  title,
  section,
}: {
  title: string;
  section: FeedbackSection;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-raised p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {section.strengths.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-good">
            ✓ Strengths
          </p>
          <ul className="space-y-1.5 text-sm leading-relaxed text-sub">
            {section.strengths.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}
      {section.improvements.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-serious">
            ↗ Improve
          </p>
          <ul className="space-y-1.5 text-sm leading-relaxed text-sub">
            {section.improvements.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      )}
      {section.strengths.length === 0 && section.improvements.length === 0 && (
        <p className="text-sm text-muted">No feedback captured.</p>
      )}
    </div>
  );
}

export default function ReportModal({
  report,
  problem,
  onDone,
}: {
  report: Report;
  problem: Problem;
  onDone: () => void;
}) {
  const hire = report.decision === "HIRE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-page/95 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-hairline bg-surface p-6 shadow-2xl sm:p-8">
        {/* Header + decision */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Interview report · {problem.title}
            </p>
            <h2 className="text-2xl font-bold">Your performance packet</h2>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${
              hire
                ? "border-good/50 bg-good/15 text-good"
                : "border-critical/50 bg-critical/15 text-critical"
            }`}
          >
            <span aria-hidden>{hire ? "✓" : "✕"}</span>
            {hire ? "HIRE" : "NO HIRE"}
          </div>
        </div>

        {/* Score tiles */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ScoreMeter label="Coding" score={report.codingScore} color="#3987e5" />
          <ScoreMeter
            label="Interviewer communication"
            score={report.communicationScore}
            color="#199e70"
          />
        </div>

        {/* Hint usage */}
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-hairline bg-raised px-4 py-3 text-sm text-sub">
          <span className="text-base" aria-hidden>
            💡
          </span>
          <span>
            <span className="font-semibold text-ink">{report.hintsUsed}</span>{" "}
            hint{report.hintsUsed === 1 ? "" : "s"} used during the session
          </span>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="mb-6 rounded-xl border border-hairline bg-raised p-4">
            <p className="mb-2 text-sm font-semibold">Committee summary</p>
            <p className="text-sm leading-relaxed text-sub">{report.summary}</p>
          </div>
        )}

        {/* Detailed feedback */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FeedbackList title="Coding" section={report.codingFeedback} />
          <FeedbackList
            title="Communication"
            section={report.communicationFeedback}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onDone}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accentDeep"
          >
            Done — back to lobby
          </button>
        </div>
      </div>
    </div>
  );
}
