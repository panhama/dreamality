'use client';
import { Button, Input, Textarea, Card, Label, Badge, Separator } from '@/components/ui/index';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Sparkles, User, Heart, Palette, Settings as SettingsIcon } from 'lucide-react';
import Switch from '@/components/ui/toggle';

export default function Home() {
  // required fields
  const [name, setName] = useState('');
  const [dream, setDream] = useState('');
  const [personality, setPersonality] = useState('');

  // optional photo
  const [photo, setPhoto] = useState<File | null>(null);

  // NEW: make story public toggle
  const [isPublic, setIsPublic] = useState(false);

  // NEW: voice & story settings
  const [voicePreset, setVoicePreset] = useState<'warm_narrator'|'playful_hero'|'epic_guardian'>('warm_narrator');
  const [energy, setEnergy] = useState(70);     // 0–100
  const [loudness, setLoudness] = useState(80); // 0–100
  const [guidance, setGuidance] = useState(35); // 0–100 (prosody/expressiveness)
  const [pace, setPace] = useState<'slow'|'normal'|'fast'>('normal');

  const [readingLevel, setReadingLevel] = useState<'early'|'primary'|'preteen'>('primary');
  const [storyLength, setStoryLength] = useState<'short'|'standard'|'epic'>('standard');
  const [imageStyle, setImageStyle] = useState<'watercolor'|'storybook'|'comic'|'paper_cut'>('storybook');

  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('dream', dream);
      formData.append('personality', personality);
      if (photo) formData.append('photo', photo);

      // pass new knobs to backend
      formData.append('voicePreset', voicePreset);
      formData.append('energy', String(energy));
      formData.append('loudness', String(loudness));
      formData.append('guidance', String(guidance));
      formData.append('pace', pace);

      formData.append('readingLevel', readingLevel);
      formData.append('storyLength', storyLength);
      formData.append('imageStyle', imageStyle);
      formData.append('isPublic', String(isPublic));

      const res = await fetch('/api/generate-story', { method: 'POST', body: formData });
      const { storyId } = await res.json();
      router.push(`/story/${storyId}`);
    } catch (error) {
      console.error('Error generating story:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4 flex items-center justify-center">
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
          <div className="flex justify-center gap-4 items-center mb-4">
            <Badge variant="secondary" className="text-sm">✨ AI-Powered Story Generation</Badge>
            <Link href="/stories" className="text-yellow-600 hover:underline text-sm font-medium">
              View Previous Stories →
            </Link>
          </div>
        </div>
        <div className='flex justify-end gap-1 items-center mb-1'>
          <Badge className='mb-1.5 p-1'>make story public</Badge>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {/* Main Card */}
        <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basics */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" /> What&apos;s your name?
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..." className="h-12 text-base border-2 focus:border-yellow-500 rounded-xl" required />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Heart className="h-4 w-4" /> What&apos;s your biggest dream?
              </Label>
              <Input value={dream} onChange={(e) => setDream(e.target.value)}
                placeholder="I dream of becoming..." className="h-12 text-base border-2 focus:border-yellow-500 rounded-xl" required />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Palette className="h-4 w-4" /> Describe your personality
              </Label>
              <Textarea value={personality} onChange={(e) => setPersonality(e.target.value)}
                placeholder="I am creative, adventurous, and love helping others..."
                className="min-h-[100px] text-base border-2 focus:border-yellow-500 rounded-xl resize-none" required />
            </div>

            <Separator className="my-6" />

            {/* Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload a photo (optional)
              </Label>
              <div className="relative">
                <Input type="file" accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  className="h-12 text-base border-2 border-dashed border-gray-300 focus:border-yellow-500 rounded-xl cursor-pointer
                           file:mr-4 file:px-4 file:my-1 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100" />
                {photo && <Badge className="absolute -top-2 -right-2 bg-green-500">✓ Photo uploaded</Badge>}
              </div>
              <p className="text-xs text-gray-500">A photo can improve character consistency in illustrations.</p>
            </div>

            <Separator className="my-6" />

            {/* Voice & Performance */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-yellow-700" />
                <h3 className="font-semibold text-gray-800">Voice & Performance</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Narration style</Label>
                  <select
                    value={voicePreset}
                    onChange={(e) => setVoicePreset(e.target.value as 'warm_narrator'|'playful_hero'|'epic_guardian')}
                    className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white"
                  >
                    <option value="warm_narrator">Warm narrator (bedtime)</option>
                    <option value="playful_hero">Playful hero (first-person)</option>
                    <option value="epic_guardian">Epic guardian (cinematic)</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Tip: “Playful hero” keeps kid-energy without mentioning age.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Pace</Label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value as 'slow'|'normal'|'fast')}
                    className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white"
                  >
                    <option value="slow">Slow & soothing</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast & excited</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Energy: {energy}</Label>
                  <input type="range" min={0} max={100} step={1}
                    value={energy} onChange={(e) => setEnergy(Number(e.target.value))}
                    className="w-full accent-yellow-600" />
                </div>

                <div className="space-y-2">
                  <Label>Loudness: {loudness}</Label>
                  <input type="range" min={0} max={100} step={1}
                    value={loudness} onChange={(e) => setLoudness(Number(e.target.value))}
                    className="w-full accent-yellow-600" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Guidance / expressiveness: {guidance}</Label>
                  <input type="range" min={0} max={100} step={1}
                    value={guidance} onChange={(e) => setGuidance(Number(e.target.value))}
                    className="w-full accent-yellow-600" />
                  <p className="text-xs text-gray-500">
                    Lower = natural, higher = more stylized acting.
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Story Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Story Options</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Reading level</Label>
                  <select
                    value={readingLevel}
                    onChange={(e) => setReadingLevel(e.target.value as 'early'|'primary'|'preteen')}
                    className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white"
                  >
                    <option value="early">Early reader (short words)</option>
                    <option value="primary">Primary (simple sentences)</option>
                    <option value="preteen">Pre-teen (richer vocab)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Story length</Label>
                  <select
                    value={storyLength}
                    onChange={(e) => setStoryLength(e.target.value as 'short'|'standard'|'epic')}
                    className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white"
                  >
                    <option value="short">Short (3–4 scenes)</option>
                    <option value="standard">Standard (6 scenes)</option>
                    <option value="epic">Epic (8–10 scenes)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Image style</Label>
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value as 'watercolor'|'storybook'|'comic'|'paper_cut')}
                    className="w-full h-12 px-3 rounded-xl border-2 focus:border-yellow-500 bg-white"
                  >
                    <option value="storybook">Storybook (soft, cozy)</option>
                    <option value="watercolor">Watercolor</option>
                    <option value="paper_cut">Paper-cut collage</option>
                    <option value="comic">Comic / cel-shade</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || !name || !dream || !personality}
              className="w-full h-12 text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 
                         hover:from-yellow-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating your magical story...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate My Surprise Story
                </div>
              )}
            </Button>
          </form>
               <div className="text-center mt-8 text-sm text-gray-500">
          <p>✨ Your story will include images, audio narration, and magical adventures ✨</p>
        </div>
        </Card>

        {/* Footer */}
   
      </div>
    </div>
  );
}
