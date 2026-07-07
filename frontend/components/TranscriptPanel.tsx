"use client";

import { useEffect, useRef } from "react";
import type { TranscriptSegment } from "@/lib/types";

export default function TranscriptPanel({
  segments,
}: {
  segments: TranscriptSegment[];
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastText = segments.length ? segments[segments.length - 1].text : "";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [segments.length, lastText]);

  if (segments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <span className="text-2xl" aria-hidden>
          💬
        </span>
        <p className="text-sm font-medium text-sub">No conversation yet</p>
        <p className="max-w-xs text-xs text-muted">
          Everything you and Alex say appears here in real time, and is included
          in your downloadable report.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {segments.map((seg) => {
        const interviewer = seg.speaker === "interviewer";
        return (
          <div
            key={seg.id}
            className={`flex ${interviewer ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl border px-3 py-2 ${
                interviewer
                  ? "border-accent/25 bg-accent/10"
                  : "border-hairline bg-raised"
              } ${seg.final ? "" : "opacity-60"}`}
            >
              <p
                className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  interviewer ? "text-accent" : "text-muted"
                }`}
              >
                {interviewer ? "Alex" : "You"}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-sub">
                {seg.text}
                {!seg.final && <span className="animate-pulse-soft">…</span>}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
