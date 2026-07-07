import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mints a short-lived LiveKit room token. API keys never leave the server.
export async function POST(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return NextResponse.json(
      {
        error:
          "Server is missing LiveKit credentials. Copy .env.example to .env.local and fill in LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
      },
      { status: 500 },
    );
  }

  let body: { problemId?: string; durationMin?: number } = {};
  try {
    body = await req.json();
  } catch {
    // fall through with defaults
  }

  const problemId = typeof body.problemId === "string" ? body.problemId : "two-sum";
  const durationMin = Math.max(10, Math.min(90, Number(body.durationMin) || 45));

  const roomName = `interview-${Math.random().toString(36).slice(2, 10)}`;
  const identity = `candidate-${Math.random().toString(36).slice(2, 8)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: "Candidate",
    ttl: "2h",
    // The agent reads the problem + duration from participant metadata.
    metadata: JSON.stringify({ problemId, durationMin }),
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({
    token: await at.toJwt(),
    serverUrl,
    roomName,
  });
}
