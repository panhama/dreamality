import { NextRequest, NextResponse } from "next/server";
import { r2Service } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { voiceDescription, previewText, loudness = 0.0, guidanceScale = 8, seed } = await req.json();

  // loudness expected -1..1; UI likely sends 0..100, map if needed
  const loud = typeof loudness === "number" && loudness > 1 ? (loudness - 50) / 50 : loudness;

  const resp = await fetch("https://api.elevenlabs.io/v1/text-to-voice/design", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      voice_description: voiceDescription,
      text: previewText ?? null, // optional – server can auto-generate
      model_id: "eleven_ttv_v3",
      loudness: loud, // -1..1
      guidance_scale: guidanceScale, // 0..100
      ...(seed != null ? { seed } : {}),
    }),
  });

  if (!resp.ok) {
    return NextResponse.json({ error: await resp.text() }, { status: resp.status });
  }
  const json = await resp.json();

  interface ElevenLabsPreview {
    generated_voice_id: string;
    language: string;
    preview_url?: string;
    audio_base_64?: string;
    duration_secs: number;
  }

  const previews =
    (json.previews ?? []).map((p: ElevenLabsPreview, i: number) => ({
      i,
      generated_voice_id: p.generated_voice_id,
      language: p.language,
      url: p.audio_base_64 ? undefined : p.preview_url, // sometimes there's a URL
      base64: p.audio_base_64 ?? null,
      duration_secs: p.duration_secs,
    })) ?? [];

  // also upload base64s to R2 for easy audition
  const playable = [];
  for (const p of previews) {
    let url = p.url;
    if (!url && p.base64) {
      const buf = Buffer.from(p.base64, "base64");
      url = await r2Service.uploadFile(buf, `voice_preview_${Date.now()}_${p.i}.mp3`, "audio/mpeg", "audio");
    }
    playable.push({ generated_voice_id: p.generated_voice_id, url, duration_secs: p.duration_secs });
  }

  return NextResponse.json({ previews: playable, text: json.text });
}