"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { getProblem } from "@/lib/problems";
import InterviewRoom from "@/components/InterviewRoom";

function FullScreenNotice({
  title,
  detail,
  spinner,
}: {
  title: string;
  detail?: string;
  spinner?: boolean;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {spinner && (
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
      )}
      <h1 className="text-xl font-semibold">{title}</h1>
      {detail && <p className="max-w-md text-sm text-sub">{detail}</p>}
    </main>
  );
}

function InterviewPageInner() {
  const params = useSearchParams();
  const router = useRouter();

  const problem = getProblem(params.get("problem"));
  const durationMin = Math.max(
    10,
    Math.min(90, parseInt(params.get("duration") ?? "45", 10) || 45),
  );

  const [conn, setConn] = useState<{ token: string; serverUrl: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problemId: problem.id, durationMin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create a session.");
        if (!cancelled) setConn(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [problem.id, durationMin]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold text-critical">
          Couldn&apos;t start the interview
        </h1>
        <p className="max-w-md text-sm text-sub">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg border border-hairline px-4 py-2 text-sm hover:border-muted"
        >
          ← Back home
        </button>
      </main>
    );
  }

  if (!conn) {
    return (
      <FullScreenNotice
        spinner
        title="Setting up your interview room…"
        detail="Minting a secure session token and dialing the interviewer."
      />
    );
  }

  return (
    <LiveKitRoom
      token={conn.token}
      serverUrl={conn.serverUrl}
      connect
      audio
      video={false}
      onDisconnected={() => router.push("/")}
      className="h-screen"
    >
      <RoomAudioRenderer />
      <StartAudio label="🔊 Click to enable interviewer audio" />
      <InterviewRoom problem={problem} durationMin={durationMin} />
    </LiveKitRoom>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={<FullScreenNotice spinner title="Loading interview…" />}
    >
      <InterviewPageInner />
    </Suspense>
  );
}
