'use client';
import { Button, Input, Textarea, Card, Label } from '@/components/ui/index'; 
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [name, setName] = useState('');
  const [dream, setDream] = useState('');
  const [personality, setPersonality] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('dream', dream);
    formData.append('personality', personality);
    if (photo) formData.append('photo', photo);

    const res = await fetch('/api/generate-story', { method: 'POST', body: formData });
    const { storyId } = await res.json();
    router.push(`/story/${storyId}`);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <Label>Name</Label>
        <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
        <Label>Dream</Label>
        <Input value={dream} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDream(e.target.value)} />
        <Label>Personality</Label>
        <Textarea value={personality} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonality(e.target.value)} />
        <Label>Upload Photo (optional)</Label>
        <Input type="file" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoto(e.target.files?.[0] || null)} accept="image/*" />
        <Button type="submit">Generate Surprise Story</Button>
      </form>
    </Card>
  );
}