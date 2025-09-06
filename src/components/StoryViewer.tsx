'use client';
import { Card, Button } from '@/components/ui/index';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface Props { storyText: string; imageUrls: string[]; audioUrls: string[]; }

export default function StoryViewer({ storyText, imageUrls, audioUrls }: Props) {
  const [currentScene, setCurrentScene] = useState(0);
  const scenes = storyText.split('\n\n');  // Simple split

  useEffect(() => {
    // Auto-play audio or add page-flip animations
  }, [currentScene]);

  return (
    <Card className="p-6">
      <h1>Dreamlity Story</h1>
      <p>{scenes[currentScene]}</p>
      {imageUrls[currentScene] && <Image src={imageUrls[currentScene]} alt="Scene" width={400} height={300} />}
      {audioUrls[currentScene] && <audio controls src={audioUrls[currentScene]} />}
      <Button onClick={() => setCurrentScene((prev) => Math.min(prev + 1, scenes.length - 1))}>Next Scene</Button>
      {/* Add PDF export button if using Payload CMS */}
    </Card>
  );
}