"use client";

export default function Timer({ remaining }: { remaining: number }) {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const label = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const tone =
    remaining <= 300
      ? "border-critical/50 bg-critical/15 text-critical animate-pulse-soft"
      : remaining <= 600
        ? "border-warn/50 bg-warn/10 text-warn"
        : "border-hairline bg-raised text-sub";

  return (
    <div
      className={`rounded-full border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${tone}`}
      title="Time remaining"
    >
      ⏱ {label}
    </div>
  );
}
