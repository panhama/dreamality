// app/page.tsx (or wherever your Home component lives)
"use client";

import { Input, Textarea, Card, Label, Badge, Separator } from "@/components/ui/index";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, User, Heart, Palette, Settings as SettingsIcon, BookOpen, ArrowRight } from "lucide-react";
import Image from "next/image";
import GenerationProgress from "@/components/GenerationProgress";
import Switch from "@/components/ui/toggle";
import GenerateButton from "@/components/ui/generate-button";
import { DesignVoiceDialog } from "@/components/DesignVoiceDialog";

export default function Home() {
  const [name, setName] = useState("");
  const [dream, setDream] = useState("");
  const [personality, setPersonality] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const [isPublic, setIsPublic] = useState(true);
  const [voicePreset, setVoicePreset] = useState<"warm_narrator"|"playful_hero"|"epic_guardian">("warm_narrator");
  const [voiceId, setVoiceId] = useState<string>("");

  const [readingLevel, setReadingLevel] = useState<"early"|"primary"|"preteen">("primary");
  const [storyLength, setStoryLength] = useState<"short"|"standard"|"epic">("standard");
  const [imageStyle, setImageStyle] = useState<"watercolor"|"storybook"|"comic"|"paper_cut"|"realistic">("storybook");

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  // Restore voice per preset
  useEffect(() => {
    const saved = localStorage.getItem(`dreamlity.voiceId.${voicePreset}`);
    setVoiceId(saved || "");
  }, [voicePreset]);

  useEffect(() => () => { setIsLoading(false); setCurrentStep(0); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setCurrentStep(1);

    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("dream", dream);
      fd.append("personality", personality);
      photos.forEach((photo, index) => {
        fd.append(`photo_${index}`, photo);
      });

      fd.append("voicePreset", voicePreset);
      fd.append("voiceId", voiceId || ""); // designed voice id if any

      fd.append("readingLevel", readingLevel);
      fd.append("storyLength", storyLength);
      fd.append("imageStyle", imageStyle);
      fd.append("isPublic", String(isPublic));

      // playful progress UX (simulated)
      setTimeout(() => setCurrentStep(2), 1500);  // planning & writing
      setTimeout(() => setCurrentStep(3), 6000);  // images
      setTimeout(() => setCurrentStep(4), 12000); // audio

      const res = await fetch("/api/generate-story", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate");

      router.push(`/story/${data.storyId}`);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setCurrentStep(0);
      alert("Failed to generate story.");
    }
  }

  return (
    <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50">
    <div className="min-h-screen p-3 flex items-center justify-center">
      {/* floating background decorations */}
      <div className="hidden sm:block pointer-events-none absolute z-50 left-0 top-20 rounded-xl overflow-hidden w-36 h-36 animate-float-slow">
        <Image src="/decorations/firefighter-superman.png" alt="decoration" fill style={{ objectFit: "cover" }} priority={false} />
      </div>
      {/* <div className="pointer-events-none absolute right-6 bottom-24 opacity-70 rounded-xl overflow-hidden w-48 h-48 animate-float-slower">
        <Image src="/decorations/superman-kid.jpg" alt="decoration" fill style={{ objectFit: "cover" }} priority={false} />
      </div> */}
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-yellow-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              Dreamlity
            </h1>
          </div>
          <p className="text-lg text-gray-600 mb-2">Create magical stories that bring dreams to life</p>
          <div className="flex justify-center flex-col gap-4 items-center mb-4">
            <Badge variant="secondary" className="text-sm">✨ AI story • images • narration</Badge>
            <Link
              href="/stories"
              className="inline-flex items-center gap-3 rounded-full px-4 py-2 bg-gradient-to-r from-amber-600 via-yellow-600 to-yellow-400 text-white text-sm font-semibold shadow-md transform transition duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-300"
              aria-label="Relive Legendary Tales - view previous stories"
            >
              <BookOpen className="h-5 w-5 opacity-95" />
              <span>Relive Legendary Tales</span>
              <ArrowRight className="h-4 w-4 opacity-95" />
            </Link>
          </div>
       
        </div>

        <div className="flex justify-end gap-1 items-center mb-1">
          <Badge className="mb-1.5 p-1">make story public</Badge>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {/* Main Card */}
        <Card className="p-8 shadow-2xl border-2 border-black bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basics */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" /> What&apos;s your name?
              </Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name..." className="h-12 text-base border-2 focus:border-yellow-500 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Heart className="h-4 w-4" /> What&apos;s your biggest dream?
              </Label>
              <Input required value={dream} onChange={(e) => setDream(e.target.value)} placeholder="I dream of becoming..." className="h-12 text-base border-2 focus:border-yellow-500 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Palette className="h-4 w-4" /> Describe your personality
              </Label>
              <Textarea required value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="I am creative, adventurous, and love helping others..." className="min-h-[100px] text-base border-2 focus:border-yellow-500 rounded-xl resize-none" />
            </div>

            <Separator className="my-6" />

            {/* Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload photos (optional, max 5)
              </Label>
              <div className="relative">
                <Input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 5);
                    setPhotos(files);
                  }}
                  className="h-12 text-base border-2 border-dashed border-gray-300 focus:border-yellow-500 rounded-xl cursor-pointer
                           file:mr-4 file:px-4 file:my-1 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100" />
                {photos.length > 0 && <Badge className="absolute -top-2 -right-2 bg-green-500">✓ {photos.length} photo{photos.length > 1 ? 's' : ''} uploaded</Badge>}
              </div>
              <p className="text-xs text-gray-500">Multiple photos can improve character consistency and blend features for richer visual storytelling.</p>
            </div>

            <Separator className="my-6" />

            {/* Voice & Performance */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-yellow-700" />
                <h3 className="font-semibold text-gray-800">Audio Narrator</h3>
              </div>

              <div className="space-y-2">
                <Label>Story narrator voice style</Label>
                <select 
                  value={voicePreset} 
                  onChange={(e) => setVoicePreset(e.target.value as "warm_narrator"|"playful_hero"|"epic_guardian")} 
                  className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white"
                >
                  <option value="warm_narrator">🌙 Warm Narrator - Perfect for bedtime stories</option>
                  <option value="playful_hero">⚡ Playful Hero - Fun & energetic storytelling</option>
                  <option value="epic_guardian">🏰 Epic Guardian - Cinematic & dramatic</option>
                </select>
                <p className="text-xs text-gray-500">
                  ✨ Stories use ElevenLabs v3 with smart emotional tags for expressive narration.
                  <br />
                  💡 Tip: Use &quot;Design / Select Voice&quot; above to create a custom voice for even more personalization.
                </p>
              </div>
            </div>            <Separator className="my-6" />

            {/* Story Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Story Options</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Reading level</Label>
                  <select value={readingLevel} onChange={(e) => setReadingLevel(e.target.value as "early"|"primary"|"preteen")} className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white">
                    <option value="early">Early reader</option>
                    <option value="primary">Primary</option>
                    <option value="preteen">Pre-teen</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Story length</Label>
                  <select value={storyLength} onChange={(e) => setStoryLength(e.target.value as "short"|"standard"|"epic")} className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white">
                    <option value="short">Short (3–4 scenes)</option>
                    <option value="standard">Standard (6 scenes)</option>
                    <option value="epic">Epic (8–10 scenes)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Image style</Label>
                  <select value={imageStyle} onChange={(e) => setImageStyle(e.target.value as "watercolor"|"storybook"|"comic"|"paper_cut"|"realistic")} className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white">
                    <option value="storybook">Storybook (soft, cozy)</option>
                    <option value="watercolor">Watercolor</option>
                    <option value="paper_cut">Paper‑cut collage</option>
                    <option value="comic">Comic / cel‑shade</option>
                    <option value="realistic">Realistic photo</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-center mt-2">
                <DesignVoiceDialog
                  preset={voicePreset}
                  onVoiceCreated={(id) => setVoiceId(id)}
                />
                {voiceId && <Badge className="ml-2">Voice set ✓</Badge>}
              </div>
            </div>


  
            {/* Submit */}
            <div className="flex justify-center">
              <GenerateButton
                text="Create Magic — Generate My Surprise Story"
                variant="primary"
                size="large"
                type="submit"
                disabled={isLoading || !name || !dream || !personality}
              />
            </div>
          </form>

          <div className="text-center mt-8 text-sm text-gray-500">
            <p>✨ Your story will include images, audio narration, and magical adventures ✨</p>
          </div>
        </Card>
      </div>

      <GenerationProgress currentStep={currentStep} isLoading={isLoading} />
    </div>
      <div aria-hidden className="flex justify-center">
        <p className="text-[11px] text-gray-700/40 italic select-none">⚠️ Not meant to replace dad-duty bedtime stories — remember to actually read it aloud. Haha!</p>
      </div>
    </div>
  );
}

