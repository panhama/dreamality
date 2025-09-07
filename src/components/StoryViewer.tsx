'use client';
import { Card, Button, Badge } from '@/components/ui/index';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2 } from 'lucide-react';

interface Scene {
  title: string;
  description: string;
}

interface Metadata {
  name: string;
  dream: string;
  personality: string;
  createdAt: string;
}

interface Props { 
  storyText: string; 
  imageUrls: string[]; 
  audioUrls: string[];
  scenes?: Scene[];
  metadata?: Metadata;
}

export default function StoryViewer({ storyText, imageUrls, audioUrls, scenes, metadata }: Props) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const storyScenes = storyText.split('\n\n').filter(scene => scene.trim());
  const totalScenes = Math.max(storyScenes.length, imageUrls.length, audioUrls.length);

  useEffect(() => {
    // Clean up previous audio
    if (audioElement) {
      audioElement.pause();
      audioElement.removeEventListener('ended', handleAudioEnd);
    }

    // Set up new audio if available
    if (audioUrls[currentScene]) {
      const audio = new Audio(audioUrls[currentScene]);
      audio.addEventListener('ended', handleAudioEnd);
      setAudioElement(audio);
    } else {
      setAudioElement(null);
    }
    
    setIsPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, audioUrls]);

  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  const toggleAudio = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const nextScene = () => {
    if (currentScene < totalScenes - 1) {
      setCurrentScene(currentScene + 1);
    }
  };

  const prevScene = () => {
    if (currentScene > 0) {
      setCurrentScene(currentScene - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header with metadata */}
      {metadata && (
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mb-2">
            {metadata.name}&apos;s Magical Adventure
          </h1>
          <div className="flex justify-center gap-2 mb-4">
            <Badge variant="secondary">Dream: {metadata.dream}</Badge>
            <Badge variant="secondary">Personality: {metadata.personality}</Badge>
          </div>
          <p className="text-sm text-gray-500">
            Created on {new Date(metadata.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Main Story Card */}
      <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm mb-6">
        {/* Scene Header */}
        {scenes && scenes[currentScene] && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {scenes[currentScene].title}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-yellow-400 to-amber-400 mx-auto rounded-full"></div>
          </div>
        )}

        {/* Image */}
        <div className="mb-6">
          {imageUrls[currentScene] ? (
            <div className="relative w-full h-[400px] rounded-xl overflow-hidden shadow-lg">
              <Image 
                src={imageUrls[currentScene]} 
                alt={scenes?.[currentScene]?.title || `Scene ${currentScene + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-[400px] bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center">
              <p className="text-gray-500">Image loading...</p>
            </div>
          )}
        </div>

        {/* Story Text */}
        <div className="mb-6">
          <p className="text-lg leading-relaxed text-gray-700 font-medium">
            {storyScenes[currentScene] || 'Story text loading...'}
          </p>
        </div>

        {/* Audio Controls */}
        {audioUrls[currentScene] && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Button
                onClick={toggleAudio}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {isPlaying ? 'Pause' : 'Play'} Narration
              </Button>
              <Volume2 className="h-5 w-5 text-gray-500" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={prevScene}
            disabled={currentScene === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalScenes }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentScene(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentScene 
                    ? 'bg-yellow-600 scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextScene}
            disabled={currentScene === totalScenes - 1}
            variant="outline"
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Scene Counter */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500">
            Scene {currentScene + 1} of {totalScenes}
          </p>
        </div>
      </Card>
    </div>
  );
}