'use client';
import { Card, Button, Badge } from '@/components/ui/index';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, BookOpen, Star, Heart } from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  caption: string;
  text: string;
  emotion_hint: string;
}

interface OldScene {
  title: string;
  description: string;
}

interface StoryData {
  title: string;
  moral: string;
  scenes: Scene[];
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
  scenes?: OldScene[];
  metadata?: Metadata;
}

export default function StoryViewer({ storyText, imageUrls, audioUrls, scenes, metadata }: Props) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [readingTimer, setReadingTimer] = useState<NodeJS.Timeout | null>(null);
  const [previousScene, setPreviousScene] = useState(-1);

  // Parse the story data from JSON
  useEffect(() => {
    try {
      const parsed = JSON.parse(storyText);
      if (parsed.title && parsed.scenes) {
        setStoryData(parsed);
      } else {
        // Fallback for old format
        setStoryData({
          title: metadata?.name ? `${metadata.name}'s Adventure` : 'Magical Story',
          moral: 'Every adventure teaches us something special.',
          scenes: scenes?.map((scene, index) => ({
            id: String(index + 1),
            title: scene.title,
            caption: scene.description || scene.title,
            text: storyText.split('\n\n')[index] || scene.description || 'A magical scene unfolds...',
            emotion_hint: 'gentle'
          })) || []
        });
      }
    } catch (error) {
      console.warn('Failed to parse story JSON, using fallback:', error);
      // Fallback for plain text stories
      const storyScenes = storyText.split('\n\n').filter(scene => scene.trim());
      setStoryData({
        title: metadata?.name ? `${metadata.name}'s Adventure` : 'Magical Story',
        moral: 'Every adventure teaches us something special.',
        scenes: storyScenes.map((text, index) => ({
          id: String(index + 1),
          title: `Scene ${index + 1}`,
          caption: text.substring(0, 50) + '...',
          text: text,
          emotion_hint: 'gentle'
        }))
      });
    }
  }, [storyText, scenes, metadata]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (readingTimer) {
        clearTimeout(readingTimer);
      }
    };
  }, [readingTimer]);

  const totalScenes = storyData?.scenes.length || 0;

  // Calculate reading time based on text length (average 200 words per minute)
  const calculateReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const wordCount = text.split(' ').length;
    const readingTimeSeconds = Math.max((wordCount / wordsPerMinute) * 60, 5); // Minimum 5 seconds
    return readingTimeSeconds * 1000; // Convert to milliseconds
  };

  // Auto-advance to next scene
  const autoAdvanceToNext = () => {
    if (autoAdvance && currentScene < totalScenes - 1 && !isFlipping) {
      setTimeout(() => {
        setIsFlipping(true);
        setTimeout(() => {
          setCurrentScene(currentScene + 1);
          setIsFlipping(false);
        }, 300);
      }, 1000); // Small delay for smooth transition
    }
  };

  // Set up reading timer for text-only scenes
  const setupReadingTimer = (text: string) => {
    if (readingTimer) {
      clearTimeout(readingTimer);
    }
    
    if (autoAdvance && !audioUrls[currentScene]) {
      const timer = setTimeout(() => {
        autoAdvanceToNext();
      }, calculateReadingTime(text));
      setReadingTimer(timer);
    }
  };

  useEffect(() => {
    // Clean up previous audio and timer
    if (audioElement) {
      audioElement.pause();
      audioElement.removeEventListener('ended', handleAudioEnd);
    }
    if (readingTimer) {
      clearTimeout(readingTimer);
      setReadingTimer(null);
    }

    // Determine if this is an auto-advance (scene increased by 1)
    const wasAutoAdvanced = previousScene >= 0 && currentScene === previousScene + 1;
    setPreviousScene(currentScene);

    // Set up new audio if available
    if (audioUrls[currentScene]) {
      const audio = new Audio(audioUrls[currentScene]);
      audio.addEventListener('ended', handleAudioEnd);
      setAudioElement(audio);

      // Auto-play if this scene change was due to auto-advance
      if (autoAdvance && wasAutoAdvanced) {
        setTimeout(() => {
          audio.play();
          setIsPlaying(true);
        }, 300); // Wait for page flip animation to complete
      } else {
        setIsPlaying(false); // Only set to false if not auto-playing
      }
    } else {
      setAudioElement(null);
      setIsPlaying(false); // No audio, so not playing
      // Set up reading timer for text-only scenes
      if (storyData?.scenes[currentScene]) {
        setupReadingTimer(storyData.scenes[currentScene].text);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, audioUrls, storyData]);

  const handleAudioEnd = () => {
    setIsPlaying(false);
    // Auto-advance after audio ends
    autoAdvanceToNext();
  };

  const toggleAudio = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      // Clear reading timer when starting audio playback
      if (readingTimer) {
        clearTimeout(readingTimer);
        setReadingTimer(null);
      }
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const nextScene = () => {
    if (currentScene < totalScenes - 1) {
      // Clear any pending auto-advance timer
      if (readingTimer) {
        clearTimeout(readingTimer);
        setReadingTimer(null);
      }
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentScene(currentScene + 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const prevScene = () => {
    if (currentScene > 0) {
      // Clear any pending auto-advance timer
      if (readingTimer) {
        clearTimeout(readingTimer);
        setReadingTimer(null);
      }
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentScene(currentScene - 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const goToScene = (sceneIndex: number) => {
    if (sceneIndex !== currentScene) {
      // Clear any pending auto-advance timer
      if (readingTimer) {
        clearTimeout(readingTimer);
        setReadingTimer(null);
      }
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentScene(sceneIndex);
        setIsFlipping(false);
      }, 300);
    }
  };

  if (!storyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p>Loading your magical story...</p>
        </Card>
      </div>
    );
  }

  const currentSceneData = storyData.scenes[currentScene];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Story Title and Moral - Only show on first page */}
        {currentScene === 0 && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-3 mb-6">
              <BookOpen className="h-10 w-10 text-yellow-600" />
              <h1 className="text-3xl py-2 font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                {storyData.title}
              </h1>
              <Star className="h-10 w-10 text-amber-500" />
            </div>
            
            {/* Moral */}
            <Card className="max-w-2xl mx-auto p-2 bg-gradient-to-r gap-1 from-yellow-100 to-amber-100 border-2 border-yellow-300">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-6 w-6 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-800">The Heart of the Story</h2>
              </div>
              <p className="text-xl text-gray-700 italic font-serif">
                {storyData.moral}
              </p>
            </Card>
          </div>
        )}

        {/* Header with metadata - Show on all pages */}
        {metadata && currentScene > 0 && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <BookOpen className="h-10 w-10 text-yellow-600" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                {metadata.name}&apos;s Adventure Book
              </h1>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
            <div className="flex justify-center gap-3 mb-4 flex-wrap">
              <Badge variant="secondary" className="text-lg px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 border-yellow-200">
                ✨ Dream: {metadata.dream}
              </Badge>
              <Badge variant="secondary" className="whitespace-normal break-words text-lg px-4 py-2 rounded-full bg-amber-100 text-amber-800 border-amber-200">
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
            rounded-3xl min-h-[850px]
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
                <div className="text-center mb-6 w-full">
                  <h2 className="text-3xl font-bold text-gray-800 mb-3 font-serif">
                    {currentSceneData.title}
                  </h2>
                  <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-amber-400 mx-auto rounded-full"></div>
                </div>

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
                          alt={currentSceneData.title}
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

                {/* Caption */}
                <div className="mt-4 text-center">
                  <p className="text-lg text-gray-700 italic font-serif bg-white/80 px-4 py-2 rounded-lg shadow-sm">
                    {currentSceneData.caption.replace(/\[([^\]]+)\]/g, '').trim()}
                  </p>
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
                      {currentSceneData.text.replace(/\[([^\]]+)\]/g, '').trim()}
                    </p>
                  </div>
                </div>

                {/* Emotion Hint */}
                <div className="mt-4 text-center">
                  <Badge variant="outline" className="text-sm px-3 py-1 bg-white/80 border-yellow-300 text-yellow-700">
                    Feeling: {currentSceneData.emotion_hint}
                  </Badge>
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
                  className="flex items-center gap-2 px-6 py-3 text-lg font-bold rounded-full cursor-pointer bg-white border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 shadow-lg"
                >
                  <ChevronLeft className="h-6 w-6" />
                  Previous Page
                </Button>

                {/* Center Audio Controls */}
                <div className="flex flex-col items-center gap-3">
                  {/* Auto-advance Toggle */}
                  <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Auto-advance:</span>
                    <button
                      onClick={() => {
                        setAutoAdvance(!autoAdvance);
                        if (!autoAdvance && readingTimer) {
                          clearTimeout(readingTimer);
                          setReadingTimer(null);
                        } else if (autoAdvance && storyData?.scenes[currentScene] && !audioUrls[currentScene]) {
                          setupReadingTimer(storyData.scenes[currentScene].text);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoAdvance ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoAdvance ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Audio Play/Pause */}
                  {audioUrls[currentScene] && (
                    <Button
                      onClick={toggleAudio}
                      size="lg"
                      className="cursor-pointer flex items-center gap-3 px-8 py-4 text-xl font-bold rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-600 hover:to-amber-600 shadow-xl transform hover:scale-105 transition-all"
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
                  className="flex items-center gap-2 px-6 py-3 text-lg font-bold rounded-full cursor-pointer bg-white border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 shadow-lg"
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