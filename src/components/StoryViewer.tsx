'use client';
import { Card, Button, Badge } from '@/components/ui/index';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, BookOpen, Star } from 'lucide-react';

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
  const [isFlipping, setIsFlipping] = useState(false);
  
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
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentScene(currentScene + 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const prevScene = () => {
    if (currentScene > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentScene(currentScene - 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const goToScene = (sceneIndex: number) => {
    if (sceneIndex !== currentScene) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentScene(sceneIndex);
        setIsFlipping(false);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with metadata - Kid Friendly */}
        {metadata && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <BookOpen className="h-10 w-10 text-yellow-600" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                {metadata.name}&apos;s Adventure Book
              </h1>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
            <div className="flex justify-center gap-3 mb-4 flex-wrap">
              <Badge variant="secondary" className="text-lg px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 border-yellow-200">
                ✨ Dream: {metadata.dream}
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 rounded-full bg-amber-100 text-amber-800 border-amber-200">
                🌟 {metadata.personality}
              </Badge>
            </div>
          </div>
        )}

        {/* Book-style Layout */}
        <div className="relative perspective-1000">
          <Card className={`
            relative overflow-hidden shadow-2xl border-4 border-yellow-200
            transition-all duration-500 ease-in-out transform-gpu
            ${isFlipping ? 'scale-95 rotate-y-12' : 'scale-100 rotate-y-0'}
            bg-gradient-to-br from-white via-yellow-50 to-amber-50
            rounded-3xl min-h-[800px]
          `}>
            
            {/* Book Pages */}
            <div className="grid md:grid-cols-2 min-h-[600px]">
              
              {/* Left Page - Image */}
              <div className="relative p-8 flex flex-col justify-center items-center bg-gradient-to-br from-yellow-50 to-orange-50 border-r-2 border-yellow-200 border-dashed">
                {/* Page number top left */}
                <div className="absolute top-4 left-4 text-sm font-bold text-yellow-600 bg-white px-3 py-1 rounded-full shadow-sm">
                  {currentScene * 2 + 1}
                </div>
                
                {/* Decorative corner */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>

                {/* Scene Title */}
                {scenes && scenes[currentScene] && (
                  <div className="text-center mb-6 w-full">
                    <h2 className="text-3xl font-bold text-gray-800 mb-3 font-serif">
                      {scenes[currentScene].title}
                    </h2>
                    <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-amber-400 mx-auto rounded-full"></div>
                  </div>
                )}

                {/* Image */}
                <div className="flex-1 w-full flex items-center justify-center max-w-md">
                  {(() => {
                    // Find the best available image for this scene
                    let imageToShow = imageUrls[currentScene];
                    
                    // If no image for current scene, use the last available image
                    if (!imageToShow) {
                      for (let i = currentScene - 1; i >= 0; i--) {
                        if (imageUrls[i]) {
                          imageToShow = imageUrls[i];
                          break;
                        }
                      }
                    }
                    
                    return imageToShow ? (
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                        <Image 
                          src={imageToShow} 
                          alt={scenes?.[currentScene]?.title || `Scene ${currentScene + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl">
                        <div className="text-center">
                          <BookOpen className="h-16 w-16 text-yellow-400 mx-auto mb-3" />
                          <p className="text-yellow-600 font-medium">Loading magical image...</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Page - Text */}
              <div className="relative p-8 flex flex-col justify-center bg-gradient-to-br from-white to-yellow-50">
                {/* Page number top right */}
                <div className="absolute top-4 right-4 text-sm font-bold text-yellow-600 bg-white px-3 py-1 rounded-full shadow-sm">
                  {currentScene * 2 + 2}
                </div>

                {/* Decorative corner */}
                <div className="absolute top-4 left-4 w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>

                {/* Story Text */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-lg">
                    <p className="text-xl leading-relaxed text-gray-800 font-serif text-justify indent-8 bg-white/70 p-6 rounded-xl shadow-sm border-l-4 border-yellow-400">
                      {storyScenes[currentScene] || 'Once upon a time, in a magical land far away...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-200 via-amber-200 to-yellow-200 p-6 border-t-2 border-yellow-300">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                
                {/* Previous Button */}
                <Button
                  onClick={prevScene}
                  disabled={currentScene === 0 || isFlipping}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2 px-6 py-3 text-lg font-bold rounded-full bg-white border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 shadow-lg"
                >
                  <ChevronLeft className="h-6 w-6" />
                  Previous Page
                </Button>

                {/* Center Audio Controls */}
                <div className="flex flex-col items-center gap-3">
                  {/* Audio Play/Pause */}
                  {audioUrls[currentScene] && (
                    <Button
                      onClick={toggleAudio}
                      size="lg"
                      className="flex items-center gap-3 px-8 py-4 text-xl font-bold rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600 shadow-xl transform hover:scale-105 transition-all"
                    >
                      {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
                      {isPlaying ? 'Pause Story' : 'Read to Me!'}
                      <Volume2 className="h-6 w-6" />
                    </Button>
                  )}

                  {/* Page Dots */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalScenes }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => goToScene(i)}
                        className={`transition-all duration-300 rounded-full ${
                          i === currentScene 
                            ? 'w-4 h-4 bg-yellow-600 shadow-lg scale-125' 
                            : 'w-3 h-3 bg-yellow-300 hover:bg-yellow-400 hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Next Button */}
                <Button
                  onClick={nextScene}
                  disabled={currentScene === totalScenes - 1 || isFlipping}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2 px-6 py-3 text-lg font-bold rounded-full bg-white border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 shadow-lg"
                >
                  Next Page
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              {/* Page Counter */}
              <div className="text-center mt-3">
                <p className="text-lg font-bold text-yellow-800">
                  📖 Page {currentScene + 1} of {totalScenes}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Back to Library Button */}
        <div className="text-center mt-8">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="lg"
            className="px-8 py-3 text-lg font-bold rounded-full bg-white border-2 border-amber-400 text-amber-700 hover:bg-amber-50 shadow-lg cursor-pointer hover:scale-105 transition-all"
          >
            📚 Back to Story Library
          </Button>
        </div>
      </div>
    </div>
  );
}