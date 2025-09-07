'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@/components/ui/index';
import { Calendar, ImageIcon, Volume2, FileText, Sparkles } from 'lucide-react';

interface StoryMetadata {
  name: string;
  dream: string;
  personality: string;
  createdAt: string;
}

interface StorySummary {
  storyId: string;
  metadata: StoryMetadata;
  imageCount: number;
  audioCount: number;
  sceneCount: number;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch('/api/stories');
        if (!response.ok) {
          throw new Error('Failed to fetch stories');
        }
        const data = await response.json();
        setStories(data.stories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stories');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p>Loading your magical stories...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-yellow-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              Your Story Library
            </h1>
          </div>
          <p className="text-lg text-gray-600 mb-4">
            All your magical adventures in one place
          </p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Create New Story
            </Button>
          </Link>
        </div>

        {/* Stories Grid */}
        {error ? (
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Stories</h2>
            <p className="text-gray-600">{error}</p>
          </Card>
        ) : stories.length === 0 ? (
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">No Stories Yet</h2>
            <p className="text-gray-600 mb-4">
              You haven&apos;t created any magical stories yet. Let&apos;s change that!
            </p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700">
                <Sparkles className="h-4 w-4 mr-2" />
                Create Your First Story
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Card
                key={story.storyId}
                className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white/80 backdrop-blur-sm"
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {story.metadata.name}&apos;s Adventure
                  </h3>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="mr-2">
                      💭 {story.metadata.dream}
                    </Badge>

                    <Badge variant="outline" className="whitespace-normal break-words">
                      ✨ {story.metadata.personality}
                    </Badge>

                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {story.sceneCount} scenes
                  </div>
                  <div className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    {story.imageCount} images
                  </div>
                  <div className="flex items-center gap-1">
                    <Volume2 className="h-4 w-4" />
                    {story.audioCount} audio
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {new Date(story.metadata.createdAt).toLocaleDateString()}
                </div>

                <Link href={`/story/${story.storyId}`}>
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 cursor-pointer">
                    Read Story
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
