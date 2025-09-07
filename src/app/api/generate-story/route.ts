// app/api/generate-story/route.ts
import { NextResponse } from "next/server";
import mime from "mime";
import { v4 as uuidv4 } from "uuid";
import { generateText } from "ai";
import { GoogleGenAI } from "@google/genai";
import { google } from "@/lib/ai/ai"; // your Vercel AI SDK Google provider
import { ElevenLabsService } from "@/lib/ai/elevenlabs";
import { minIOService } from "@/lib/minio";
import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";

// This route needs Node APIs (Buffer/MinIO), not Edge.
export const runtime = "nodejs";

type ScenePlan = {
  id: string;               // "1", "2", ...
  title: string;            // "Alarm at Midnight"
  caption: string;          // 1 sentence caption for the page
  description: string;      // what happens
  illustration_prompt: string; // visual description for the illustrator
};

type StoryScene = {
  id: string;
  title: string;
  caption: string;
  text: string;             // 2–4 short sentences
  emotion_hint: string;     // "excited", "serious", "gentle", etc
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Add expressive audio tags without mentioning age.
// You can tweak the heuristics to taste.
function tagLine(base: string, hint: string, i: number) {
  const t = base.trim();

  // Gentle heuristics
  const excited = /\!|let.?s go|ready|woo+/i.test(t);
  const serious = /(focus|careful|listen|danger|stay calm|steady)/i.test(t);
  const gentle  = /(it’s okay|you’re safe|all right|we’re here)/i.test(t);
  const laugh   = /(we did it|hooray|yay|awesome)/i.test(t);
  const whoosh  = /(spray|hose|truck|sir(en)?|whoosh|roar)/i.test(t);

  const tags: string[] = [];
  if (hint.includes("excited") || excited) tags.push("excited");
  if (hint.includes("serious") || serious) tags.push("serious");
  if (hint.includes("gentle")  || gentle)  tags.push("gentle");
  if (laugh) tags.push("laughs softly");
  if (whoosh) tags.push("sfx: whoosh");

  // Add breaths/pacing
  if (i === 0) tags.unshift("smiling");
  if (t.length > 90) tags.push("quick breath");

  const prefix = tags.length ? `[${tags.join(", ")}] ` : "";
  return prefix + t;
}

function buildNarrationScript(scenes: StoryScene[], mode: "narrator"|"playful"|"epic", pace: "slow"|"normal"|"fast") {
  const speedIntro =
    pace === "fast" ? "[higher pitch] " :
    pace === "slow" ? "[soft, slow] " :
    "";
  const lines: string[] = [];
  for (const s of scenes) {
    const sentences = s.text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const hint = s.emotion_hint.toLowerCase();
    lines.push(`[pause]`); // page turn
    if (mode === "playful") {
      // Light first-person reframe without impersonation words
      lines.push(tagLine(`${speedIntro}${s.caption}`, hint, 0));
      sentences.forEach((sent, i) => lines.push(tagLine(sent, hint, i + 1)));
    } else if (mode === "epic") {
      lines.push(tagLine(`[deep, cinematic] ${s.caption}`, "serious", 0));
      sentences.forEach((sent, i) => lines.push(tagLine(sent, hint || "serious", i + 1)));
    } else {
      lines.push(tagLine(`${speedIntro}${s.caption}`, hint, 0));
      sentences.forEach((sent, i) => lines.push(tagLine(sent, hint || "gentle", i + 1)));
    }
  }
  return lines.join(" ");
}

export async function POST(req: Request) {
  try {
    // -------- Parse form --------
    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    const dream = String(formData.get("dream") || "").trim();
    const personality = String(formData.get("personality") || "").trim();

    const voicePreset = (formData.get("voicePreset") as string) || "warm_narrator"; // warm_narrator | playful_hero | epic_guardian
    const energy = parseInt((formData.get("energy") as string) || "70", 10);
    const loudness = parseInt((formData.get("loudness") as string) || "80", 10);
    const guidance = parseInt((formData.get("guidance") as string) || "35", 10);
    const pace = (formData.get("pace") as "slow"|"normal"|"fast") || "normal";

    const readingLevel = (formData.get("readingLevel") as string) || "primary";
    const storyLength  = (formData.get("storyLength")  as string) || "standard"; // short|standard|epic
    const imageStyle   = (formData.get("imageStyle")   as string) || "storybook";
    const isPublic     = String(formData.get("isPublic")) === "true";

    // optional: persistent designed voice id from the new dialog
    const designedVoiceId = (formData.get("voiceId") as string) || "";

    const photo = formData.get("photo") as File | null;

    // -------- Optional reference photo --------
    let referenceImagePart:
      | { inlineData: { mimeType: string; data: string } }
      | null = null;

    try {
      if (photo && typeof photo.arrayBuffer === "function" && photo.size > 0) {
        const ab = await photo.arrayBuffer();
        const b64 = Buffer.from(ab).toString("base64");
        const mimeType = photo.type || mime.getType(photo.name || "") || "image/jpeg";
        referenceImagePart = { inlineData: { mimeType, data: b64 } };
      }
    } catch (e) {
      console.warn("Reference photo skipped:", e);
    }

    // -------- Helpers --------
    const getSceneCount = () =>
      storyLength === "short"   ? 4 :
      storyLength === "epic"    ? 9 :
      6;

    const readingGuide =
      readingLevel === "early"
        ? "Use short words and very short sentences. Avoid complex clauses."
        : readingLevel === "preteen"
        ? "Use richer vocabulary with slightly longer sentences; still friendly and clear."
        : "Use clear, simple sentences with a friendly, upbeat tone.";

    // -------- 1) PLAN (strict JSON) --------
    const plannerPrompt = `
Plan a ${getSceneCount()}-scene children's story arc.

Hero name: ${name}
Dream: ${dream}
Personality traits: ${personality}

Return STRICT JSON with this schema (no markdown, no commentary, no extra keys):
{
  "scenes": [
    {
      "id": "1",
      "title": "Short scene title",
      "caption": "One short caption that could sit under an illustration",
      "description": "1–2 sentences describing what happens",
      "illustration_prompt": "One line describing the visual for this scene: setting, mood, hero outfit/props, warm palette, no on-image text"
    }
  ]
}
Rules:
- Keep a consistent visual identity for ${name} across all scenes (hair, outfit colors, one signature prop).
- Keep it positive and heroic.
- ${readingGuide}
`;

    const { text: planTextRaw } = await generateText({
      model: google("models/gemini-2.5-flash"),
      prompt: plannerPrompt,
    });

    const planText = planTextRaw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let plan: { scenes: ScenePlan[] };
    try {
      plan = JSON.parse(planText);
    } catch {
      // Fallback plan
      plan = {
        scenes: Array.from({ length: getSceneCount() }, (_, i) => ({
          id: String(i + 1),
          title: i === 0 ? "The Alarm" : i === getSceneCount() - 1 ? "Heroes Rest" : `Scene ${i + 1}`,
          caption:
            i === 0
              ? `${name} hears the call and gets ready.`
              : i === getSceneCount() - 1
              ? `${name} smiles, knowing helping people matters most.`
              : `${name} keeps going—brave and kind.`,
          description:
            i === 0
              ? `${name} prepares to act like a real ${dream}, quick and careful.`
              : i === getSceneCount() - 1
              ? `${name} reflects on the day, proud and thankful.`
              : `${name} faces a moment and learns something useful.`,
          illustration_prompt:
            "Warm, cozy storybook vibe; soft edges; gentle light; hero centered; no on-image text.",
        })),
      };
    }

    // -------- 2) WRITE (strict JSON scenes) --------
    const writerPrompt = `
Write the story from this plan as STRICT JSON: 
{
  "title": "Picture-book title",
  "moral": "Short positive moral",
  "scenes": [
    { "id": "1", "title":"", "caption":"", "text":"2–4 short sentences", "emotion_hint":"excited|serious|gentle|encouraging" }
  ]
}
Constraints:
- ${readingGuide}
- Keep ${name} consistent; uplifting, brave, kind tone.
- Use everyday vocabulary; no on-image text; no violence.
Here is the plan JSON:
${JSON.stringify(plan)}
`;

    const { text: storyJsonRaw } = await generateText({
      model: google("models/gemini-2.5-flash"),
      prompt: writerPrompt,
    });

    const storyJson = storyJsonRaw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let story: { title: string; moral: string; scenes: StoryScene[] };
    try {
      story = JSON.parse(storyJson);
    } catch {
      // emergency fallback from plan
      story = {
        title: `${name} the ${dream} Hero`,
        moral: "Real heroes are kind, careful, and helpful.",
        scenes: plan.scenes.map((p) => ({
          id: p.id,
          title: p.title,
          caption: p.caption,
          text: p.description,
          emotion_hint: "encouraging",
        })),
      };
    }

    // -------- 3) IMAGES (Gemini 2.5 Flash Image Preview) --------
    const styleMap: Record<string, string> = {
      watercolor: "soft watercolor washes, gentle edges",
      comic: "bold lines, cel-shaded colors, cheerful",
      paper_cut: "paper-cut collage, layered textures",
      realistic: "photorealistic lighting, natural textures",
      storybook: "warm cozy storybook, painterly brush, soft light",
    };

    const stylePrompt = styleMap[imageStyle] || styleMap.storybook;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const imageUrls: string[] = [];
    let fileIndex = 0;

    for (const p of plan.scenes) {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (referenceImagePart) parts.push(referenceImagePart);

      const visual = [
        `Create a square 1:1 illustration for a children's picture book.`,
        `Style: ${stylePrompt}.`,
        `Hero: keep ${name} visually consistent across scenes (hair, outfit colors, one signature prop).`,
        `Caption vibe: ${p.caption}`,
        `Scene: ${p.illustration_prompt}`,
        `No text on image. Kid-friendly. Warm palette.`,
      ].join("\n");

      parts.push({ text: visual });

      try {
        const response = await ai.models.generateContentStream({
          model: "gemini-2.5-flash-image-preview",
          contents: [{ role: "user", parts }],
          config: { responseModalities: ["IMAGE", "TEXT"] },
        });

        let done = false;
        for await (const chunk of response) {
          const inline = chunk?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (!inline?.data) continue;

          const buffer = Buffer.from(inline.data, "base64");
          const ext = mime.getExtension(inline.mimeType || "") || "png";
          const name = `${uuidv4()}_${fileIndex++}.${ext}`;

          try {
            const url = await minIOService.uploadFile(buffer, name, inline.mimeType || "image/png", "images");
            imageUrls.push(url);
          } catch (minioError) {
            console.warn("MinIO upload failed, saving to local public folder:", minioError);
            // Fallback: save to public/generated folder
            const fs = await import('fs/promises');
            const path = await import('path');
            const publicDir = path.join(process.cwd(), 'public', 'generated');
            await fs.mkdir(publicDir, { recursive: true });
            await fs.writeFile(path.join(publicDir, name), buffer);
            imageUrls.push(`/generated/${name}`);
            console.log(`✓ Image saved locally: /generated/${name}`);
          }
          done = true;
          break;
        }
        if (!done) imageUrls.push("/placeholder-image.svg");
      } catch (e) {
        console.error("Image gen error:", e);
        imageUrls.push("/placeholder-image.svg");
      }
    }

    // -------- 4) AUDIO (ElevenLabs v3 + tags) --------
    // Build expressive narration
    const mode: "playful" | "epic" | "narrator" =
      voicePreset === "playful_hero" ? "playful" :
      voicePreset === "epic_guardian" ? "epic" : "narrator";

    const narrationScript = buildNarrationScript(story.scenes, mode, pace);

    // v3’s best practice is chunking to ~3k chars.
    // Here we split on scene boundaries (already separated by [pause]).
    const chunks = narrationScript
      .split(/\[pause\]/g)
      .map(s => s.trim())
      .filter(Boolean)
      .map((s, i) => (i === 0 ? s : "[pause] " + s));

    // Voice config: use designed voice if provided, else presets
    const presetToFallbackVoice = () => {
      switch (voicePreset) {
        case "playful_hero": return ElevenLabsService.VOICES.FREYA;
        case "epic_guardian": return ElevenLabsService.VOICES.DANIEL;
        default: return ElevenLabsService.VOICES.RACHEL;
      }
    };

    const chosenVoiceId = designedVoiceId || presetToFallbackVoice();

    const elevenLabsService = new ElevenLabsService();

    const stability = clamp(1 - energy / 100, 0.25, 0.85);
    const style = clamp(guidance / 100, 0.1, 1);
    const similarity_boost = clamp(loudness / 100, 0.6, 1);

    const audioResults = await elevenLabsService.generateBatchAudio(chunks, {
      voiceId: chosenVoiceId,
      model: ElevenLabsService.MODELS.TURBO_V2_5, // Using turbo_v2_5 which works reliably
      voiceSettings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost: true,
      },
      outputFormat: "mp3_44100_128",
    });

    const audioUrls = audioResults.map((r) => r.publicUrl || "");

    // -------- 5) Persist & respond --------
    const storyId = uuidv4();

    try {
      await db.insert(storiesTable).values({
        storyId: storyId,
        storyText: JSON.stringify(story), // keep structured result
        imageUrls,
        audioUrls,
        scenes: story.scenes.map(scene => ({
          title: scene.title,
          description: scene.caption
        })),
        metadata: {
          name,
          dream,
          personality,
          createdAt: new Date().toISOString(),
          voicePreset,
          designedVoiceId: designedVoiceId || null,
          knobs: { energy, loudness, guidance, pace },
          readingLevel,
          storyLength,
          imageStyle,
        },
        isPublic,
      } as typeof storiesTable.$inferInsert);
    } catch (dbErr) {
      console.error("DB insert failed:", dbErr);
      return NextResponse.json(
        { error: "Failed to save story to database", details: dbErr instanceof Error ? dbErr.message : String(dbErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      storyId,
      story,
      imageUrls,
      audioUrls,
      savedToDatabase: true,
    });
  } catch (err) {
    console.error("generate-story error:", err);
    return NextResponse.json({ error: "Failed to generate story" }, { status: 500 });
  }
}
