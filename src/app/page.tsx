'use client';
import { Button, Input, Textarea, Card, Label, Badge, Separator } from '@/components/ui/index'; 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Sparkles, User, Heart, Palette } from 'lucide-react';
import Switch from '@/components/ui/toggle';

export default function Home() {
  const [name, setName] = useState('');
  const [dream, setDream] = useState('');
  const [personality, setPersonality] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
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
      <Switch />
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-yellow-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              Dreamality
            </h1>
          </div>
          <p className="text-lg text-gray-600 mb-2">Create magical stories that bring dreams to life</p>
          <div className="flex justify-center gap-4 items-center mb-4">
            <Badge variant="secondary" className="text-sm">
              ✨ AI-Powered Story Generation
            </Badge>
            <Link href="/stories" className="text-yellow-600 hover:underline text-sm font-medium">
              View Previous Stories →
            </Link>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                What&apos;s your name?
              </Label>
              <Input 
                value={name} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="h-12 text-base border-2 focus:border-yellow-500 rounded-xl"
                required
              />
            </div>

            {/* Dream Field */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                What&apos;s your biggest dream?
              </Label>
              <Input 
                value={dream} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDream(e.target.value)}
                placeholder="I dream of becoming..."
                className="h-12 text-base border-2 focus:border-yellow-500 rounded-xl"
                required
              />
            </div>

            {/* Personality Field */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Describe your personality
              </Label>
              <Textarea 
                value={personality} 
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonality(e.target.value)}
                placeholder="I am creative, adventurous, and love helping others..."
                className="min-h-[100px] text-base border-2 focus:border-yellow-500 rounded-xl resize-none"
                required
              />
            </div>

            <Separator className="my-6" />

            {/* Photo Upload Field */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload a photo (optional)
              </Label>
              <div className="relative">
                <Input 
                  type="file" 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoto(e.target.files?.[0] || null)} 
                  accept="image/*"
                  className="h-12 text-base border-2 border-dashed border-gray-300 focus:border-yellow-500 rounded-xl cursor-pointer
                           file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                           file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                />
                {photo && (
                  <Badge className="absolute -top-2 -right-2 bg-green-500">
                    ✓ Photo uploaded
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Adding a photo helps create a more personalized story experience
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={isLoading || !name || !dream || !personality}
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 
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
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>✨ Your story will include images, audio narration, and magical adventures ✨</p>
        </div>
      </div>
    </div>
  );
}