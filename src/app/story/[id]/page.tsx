'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import StoryViewer from '@/components/StoryViewer';
import { Card } from '@/components/ui/index';

interface Story {
  storyId: string;
  storyText: string;
  imageUrls: string[];
  audioUrls: string[];
  scenes: Array<{ title: string; description: string }>;
  metadata: {
    name: string;
    dream: string;
    personality: string;
    createdAt: string;
  };
}

export default function StoryPage() {
  const params = useParams();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/story/${params.id}`);
        if (!response.ok) {
          throw new Error('Story not found');
        }
        const storyData = await response.json();
        setStory(storyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchStory();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p>Loading your magical story...</p>
        </Card>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Story Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error || 'The story you are looking for does not exist.'}
          </p>
          <Link href="/" className="text-yellow-600 hover:underline">
            Create a new story
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 p-4">
      <StoryViewer
        storyText={story.storyText}
        imageUrls={story.imageUrls}
        audioUrls={story.audioUrls}
        scenes={story.scenes}
        metadata={story.metadata}
      />
    </div>
  );
}
