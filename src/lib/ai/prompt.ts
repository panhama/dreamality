// lib/ai/prompts.ts

export type ReadingLevel = "early" | "primary" | "preteen";

export const readingGuidance = (level: ReadingLevel) => {
  switch (level) {
    case "early":
      return "Use simple, short words and very short sentences. Keep 5–9 words per sentence when possible.";
    case "preteen":
      return "Use richer vocabulary and slightly more complex sentences suitable for pre-teens.";
    default:
      return "Use clear, engaging language with simple to moderate sentence structures.";
  }
};

export const plannerPrompt = (opts: {
  name: string;
  dream: string;
  personality: string;
  sceneCount: string; // "3-4" | "6" | "8-10"
  level: ReadingLevel;
}) => `
Plan a ${opts.sceneCount} scene children's story arc starring ${opts.name}.
Dream/Theme: ${opts.dream}
Personality: ${opts.personality}

${readingGuidance(opts.level)}

Return ONLY valid JSON in this exact shape (no markdown fences, no commentary):
[
  {"title":"<short scene title>","description":"<1-2 friendly sentences describing the moment>"},
  ...
]
Ensure each scene advances the plot and sets up the next one.
`;

export const writerPrompt = (opts: {
  name: string;
  scenesJson: string;
  level: ReadingLevel;
  tone?: string; // "uplifting, brave, kind"
}) => `
Write the complete story for the following arc (JSON):
${opts.scenesJson}

${readingGuidance(opts.level)}
Tone: ${opts.tone ?? "uplifting, brave, kind, cozy"}

Write a short title, a one-line moral, and one compact paragraph per scene (2–4 sentences).
Return ONLY JSON:
{
  "title": "<title>",
  "moral": "<one-line moral>",
  "scenes": [
    {"id":"1","caption":"<tiny caption>","text":"<scene prose>"},
    ...
  ]
}
`;

export const illustrationPrompt = (opts: {
  name: string;
  description: string;
  personality: string;
  style: "watercolor" | "storybook" | "comic" | "paper_cut" | "realistic";
  square?: boolean;
  usePhoto: boolean;
}) => {
  const styleText =
    opts.style === "watercolor"
      ? "soft watercolor with gentle washes and flowing colors"
      : opts.style === "comic"
      ? "comic/cel-shaded style with clean line art and vibrant flats"
      : opts.style === "paper_cut"
      ? "paper-cut collage with layered textures and craft-like shapes"
      : opts.style === "realistic"
      ? "photorealistic, natural lighting, authentic textures"
      : "cozy storybook with warm palette, painterly textures, soft edges";

  const base = opts.style === "realistic"
    ? `Create a photorealistic image of: ${opts.description}.`
    : `Create an illustration of: ${opts.description}.`;

  const consist = opts.usePhoto
    ? `Maintain the same facial features and hair as the provided reference photo of ${opts.name}.`
    : `Keep ${opts.name}'s look consistent across scenes; reflect ${opts.personality} in expression and pose.`;

  const aspect = opts.square ? "Output as a perfect 1:1 square." : "Prefer a 3:2 or 16:9 landscape.";

  return `${base}
Style: ${styleText}
Character consistency: ${consist}
Child-friendly, magical and inspiring. ${aspect}
No on-image text; avoid UI artifacts or watermarks.`;
};

export const makeNarrationScriptWithCues = (title: string, moral: string, scenes: Array<{text: string}>) => {
  const body = scenes.map((s, i) => {
    // sprinkle mild cues
    const cueOpen = i === 0 ? "[excited] " : i % 2 === 0 ? "[smiling] " : "[serious] ";
    const cueClose = i === scenes.length - 1 ? " [gentle]" : "";
    return `${cueOpen}${s.text}${cueClose}`;
  }).join("\n\n");

  return `[title] ${title}\n\n${body}\n\n[soft, warm tone] Moral: ${moral}`;
};
