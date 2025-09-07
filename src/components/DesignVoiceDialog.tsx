// components/DesignVoiceDialog.tsx
"use client";
import * as React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

type Props = {
  preset: "warm_narrator" | "playful_hero" | "epic_guardian";
  onVoiceCreated: (voiceId: string) => void;
};

const DEFAULT_DESCRIPTIONS: Record<Props["preset"], string> = {
  warm_narrator:
    "A warm, friendly storytelling voice with gentle excitement and clear diction. Bedtime cadence, natural breaths, supportive and kind. Reads like a picture-book narrator without imitating any specific person.",
  playful_hero:
    "A lively, bright storytelling voice full of curiosity and courage. Playful energy, quick smiles in the tone, light breaths. Clear diction; upbeat and adventurous; feels like the protagonist telling their story.",
  epic_guardian:
    "A steady, cinematic storytelling voice—calm, strong, reassuring. Deep presence with controlled dynamics. Inspiring and composed, like a guardian guiding the adventure.",
};

const PREVIEW_WITH_TAGS = `
[excited] Lights flash and wheels roll—time to help! [quick breath]
[smiling] Helmet on, gloves snug—ready for action.
[serious] Focus now: keep people safe, work as a team.
[encouraging] You're okay—follow me. [gentle]
Water arcs—[sfx: whoosh]—and the glow fades. [pause] We did it!
[soft, warm tone] Being a hero means being kind, careful, and ready when someone needs you.
`.trim();

export function DesignVoiceDialog({ preset, onVoiceCreated }: Props) {
  const [desc, setDesc] = React.useState(DEFAULT_DESCRIPTIONS[preset]);
  const [previewText, setPreviewText] = React.useState(PREVIEW_WITH_TAGS);
  const [guidance, setGuidance] = React.useState(8);  // 0..100
  const [loudness, setLoudness] = React.useState(0.4); // -1..1
  const [loading, setLoading] = React.useState(false);
  const [previews, setPreviews] = React.useState<{ url: string; generated_voice_id: string }[]>([]);
  const [picked, setPicked] = React.useState<string>("");

  async function design() {
    setLoading(true);
    setPreviews([]);
    setPicked("");
    const res = await fetch("/api/voice-design", {
      method: "POST",
      body: JSON.stringify({ voiceDescription: desc, previewText, guidanceScale: guidance, loudness }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setPreviews((data.previews || []).slice(0, 3));
    setLoading(false);
  }

  async function createVoice() {
    if (!picked) return;
    setLoading(true);
    const res = await fetch("/api/voice-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generatedVoiceId: picked,
        voiceName: `Dreamlity ${preset} ${Date.now()}`,
        voiceDescription: desc,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.voiceId) {
      // persist to localStorage by preset for convenience
      localStorage.setItem(`dreamlity.voiceId.${preset}`, data.voiceId);
      onVoiceCreated(data.voiceId);
  // close dialog (click close button if present)
  const closeBtn = document.querySelector('[data-dialog-close]') as HTMLElement | null;
  if (closeBtn) closeBtn.click();
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="default"
className="bg-gradient-to-r from-red-600 to-yellow-500 text-white hover:from-red-600 hover:to-yellow-600 border-0 shadow-lg transform transition-transform duration-200 hover:scale-105 mr-2"        >
          <Sparkles className="h-5 w-5 mr-2" />
          Design / Select Voice
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Design a voice for “{preset.replace("_", " ")}”</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[120px]" />
            <p className="text-xs text-muted-foreground">Describe tone, pacing, emotion. Avoid ages or imitation; focus on style.</p>
          </div>

          <div className="space-y-2">
            <Label>Preview text (with [tags])</Label>
            <Textarea value={previewText} onChange={(e) => setPreviewText(e.target.value)} className="min-h-[120px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Guidance (0–100): {guidance}</Label>
              <Slider
                value={[guidance]}
                onValueChange={(v: number[]) => setGuidance(v[0] ?? 8)}
                min={0}
                max={100}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Loudness (-1..1): {loudness.toFixed(2)}</Label>
              {/* Map loudness (-1..1) to slider 0..100 for UI friendliness */}
              <Slider
                value={[Math.round((loudness + 1) * 50)]}
                onValueChange={(v: number[]) => setLoudness(((v[0] ?? 50) / 50) - 1)}
                min={0}
                max={100}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={design} disabled={loading}>{loading ? "Designing..." : "Generate Previews"}</Button>
            <Button onClick={createVoice} disabled={!picked || loading} variant="default">Create Voice from Selected</Button>
          </div>

          {!!previews.length && (
            <div className="grid gap-3">
              {previews.map((p, idx) => (
                <label key={p.generated_voice_id} className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer">
                  <input type="radio" name="preview" value={p.generated_voice_id} onChange={() => setPicked(p.generated_voice_id)} />
                  <span className="text-sm font-medium">Preview {idx + 1}</span>
                  <audio controls src={p.url} className="ml-auto" />
                </label>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
