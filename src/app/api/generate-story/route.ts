// app/api/generate-story/route.ts
import { NextResponse } from "next/server";
import mime from "mime";
import { v4 as uuidv4 } from "uuid";
import { generateText } from "ai";
import { GoogleGenAI } from "@google/genai";
import { google } from "@/lib/ai/ai";
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

// Enhanced expressive audio tags for ElevenLabs v3
// Supports comprehensive tagging system for:
// 1. Pacing & Demeanor: [slowly], [quickly], [hesitant], [whisper], [urgently], [calmly]
// 2. Vocal Effects: [higher pitch], [lower pitch], [soft volume], [loud], [strong], [breathy], [nasal]
// 3. Breaths & Pauses: [quick breath], [deep breath], [sigh], [giggle], [light chuckle], [laugh], [pause], [beat]
// Tags are automatically filtered from frontend display using regex: /\[([^\]]+)\]/g
function tagLine(base: string, hint: string, i: number) {
  const t = base.trim();
  const hint_lower = hint.toLowerCase();

  // Emotion-based tagging with v3 tags
  const tags: string[] = [];

  // Pacing & Demeanor
  if (hint_lower.includes("excited") || /\!|let.?s go|ready|woo+|yay|hooray/i.test(t)) {
    tags.push("quickly", "higher pitch");
  }
  if (hint_lower.includes("serious") || /(focus|careful|listen|danger|stay calm|steady)/i.test(t)) {
    tags.push("calmly", "lower pitch");
  }
  if (hint_lower.includes("gentle") || /(it.?s okay|you.?re safe|all right|we.?re here)/i.test(t)) {
    tags.push("slowly", "soft volume");
  }
  if (hint_lower.includes("urgent") || /(hurry|quick|fast|rush)/i.test(t)) {
    tags.push("urgently");
  }
  if (hint_lower.includes("hesitant") || /(maybe|perhaps|um|uh)/i.test(t)) {
    tags.push("hesitant");
  }
  if (hint_lower.includes("whisper") || /(secret|quiet|shh)/i.test(t)) {
    tags.push("whisper");
  }

  // Vocal Effects & Prosodic Variation
  if (hint_lower.includes("loud") || /(shout|yell|boom|crash)/i.test(t)) {
    tags.push("loud", "strong");
  }
  if (hint_lower.includes("breathy") || /(wind|sigh|breath)/i.test(t)) {
    tags.push("breathy");
  }
  if (hint_lower.includes("soft") || /(gentle|quiet|whisper)/i.test(t)) {
    tags.push("soft volume");
  }

  // Breaths, Laughter, and Pauses
  if (hint_lower.includes("laugh") || /(ha|hee|hooray|yay|awesome|we did it)/i.test(t)) {
    const laughTags = ["giggle", "light chuckle", "laugh"];
    tags.push(laughTags[Math.floor(Math.random() * laughTags.length)]);
  }
  if (hint_lower.includes("sigh") || /(oh|ah|wow|phew)/i.test(t)) {
    tags.push("sigh");
  }

  // Add breaths/pacing based on context
  if (i === 0) tags.unshift("smiling"); // Start with a smile
  if (t.length > 90) tags.push("quick breath"); // Long sentences need breath
  if (t.includes("?")) tags.push("beat"); // Questions get a dramatic pause
  if (t.includes("!")) tags.push("pause"); // Exclamation gets a pause

  // Remove duplicates and join
  const uniqueTags = [...new Set(tags)];
  const prefix = uniqueTags.length ? `[${uniqueTags.join(", ")}] ` : "";
  return prefix + t;
}

function buildNarrationScript(scenes: StoryScene[], mode: "narrator"|"playful"|"epic", pace: "slow"|"normal"|"fast") {
  const globalPaceTag =
    pace === "fast" ? "quickly" :
    pace === "slow" ? "slowly" :
    "calmly";

  const lines: string[] = [];

  for (const s of scenes) {
    const sentences = s.text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const hint = s.emotion_hint.toLowerCase();

    // Page turn pause
    lines.push(`[pause]`);

    // Mode-specific introduction
    if (mode === "playful") {
      lines.push(tagLine(`[${globalPaceTag}, smiling] ${s.caption}`, hint, 0));
    } else if (mode === "epic") {
      lines.push(tagLine(`[${globalPaceTag}, lower pitch, strong] ${s.caption}`, "serious", 0));
    } else {
      lines.push(tagLine(`[${globalPaceTag}] ${s.caption}`, hint, 0));
    }

    // Process each sentence with appropriate tags
    sentences.forEach((sent, i) => {
      let processedSentence = sent;

      // Add sentence-specific effects
      if (sent.includes("!") && hint.includes("excited")) {
        processedSentence = tagLine(sent, "excited", i + 1);
      } else if (sent.includes("?")) {
        processedSentence = tagLine(sent, "hesitant", i + 1);
      } else if (sent.includes("...")) {
        processedSentence = tagLine(sent, "slowly", i + 1);
      } else {
        processedSentence = tagLine(sent, hint || "gentle", i + 1);
      }

      lines.push(processedSentence);
    });
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
    // Use smart defaults for audio parameters (simplified frontend)
    const energy = 70; // Default balanced energy
    const loudness = 80; // Default good volume
    const guidance = 35; // Default natural expression
    const pace = "normal" as "slow"|"normal"|"fast"; // Default pace

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
    {
      "id": "1",
      "title":"",
      "caption":"",
      "text":"2–4 short sentences",
      "emotion_hint":"excited|serious|gentle|hesitant|urgent|whisper|loud|breathy|soft|calm|quick|slow"
    }
  ]
}
Constraints:
- ${readingGuide}
- Keep ${name} consistent; uplifting, brave, kind tone.
- Use everyday vocabulary; no on-image text; no violence.
- For emotion_hint, choose the most appropriate from: excited, serious, gentle, hesitant, urgent, whisper, loud, breathy, soft, calm, quick, slow
- Match emotion_hint to the scene's mood and action
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

    // For v3 API, stability must be one of [0.0, 0.5, 1.0]
    const stability = energy < 33 ? 0.0 : energy < 66 ? 0.5 : 1.0; // 0.0 = Creative, 0.5 = Natural, 1.0 = Robust
    const style = clamp(guidance / 100, 0.1, 1);
    const similarity_boost = clamp(loudness / 100, 0.6, 1);

    const audioResults = await elevenLabsService.generateBatchAudio(chunks, {
      voiceId: chosenVoiceId,
      model: ElevenLabsService.MODELS.ELEVEN_V3, // Updated to use ELEVEN_V3
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
          // Smart defaults for simplified audio config
          knobs: { energy: 70, loudness: 80, guidance: 35, pace: "normal" },
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
