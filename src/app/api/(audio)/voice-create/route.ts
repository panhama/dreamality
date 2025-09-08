import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { generatedVoiceId, voiceName, voiceDescription, labels } = await req.json();

  const resp = await fetch("https://api.elevenlabs.io/v1/text-to-voice", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      voice_name: voiceName ?? "Dreamlity Voice",
      voice_description: voiceDescription ?? "Narration voice generated for Dreamlity.",
      generated_voice_id: generatedVoiceId,
      labels: labels ?? { app: "Dreamlity" },
    }),
  });

  if (!resp.ok) {
    return NextResponse.json({ error: await resp.text() }, { status: resp.status });
  }
  const json = await resp.json(); // { voice_id, preview_url, ... }
  return NextResponse.json({ voiceId: json.voice_id, previewUrl: json.preview_url });
}
