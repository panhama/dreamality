// components/DesignVoiceDialog.tsx
"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [open, setOpen] = React.useState(false);
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
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary" size="sm"><Sparkles className="h-4 w-4 mr-1" />Design / Select Voice</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Design a voice for “{preset.replace("_", " ")}”</DialogTitle>
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
              <input type="range" min={0} max={100} value={guidance} onChange={(e) => setGuidance(+e.target.value)} className="w-full" />
            </div>
            <div>
              <Label>Loudness (-1..1): {loudness.toFixed(2)}</Label>
              <input type="range" min={-1} max={1} step={0.01} value={loudness} onChange={(e) => setLoudness(+e.target.value)} className="w-full" />
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
