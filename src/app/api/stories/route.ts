import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const STORIES_DIR = path.join(process.cwd(), 'data', 'stories');

export async function GET() {
  try {
    // Ensure stories directory exists
    await fs.mkdir(STORIES_DIR, { recursive: true });
    
    // Read all story files
    const files = await fs.readdir(STORIES_DIR);
    const storyFiles = files.filter(file => file.endsWith('.json'));
    
    const stories = await Promise.all(
      storyFiles.map(async (file) => {
        try {
          const storyPath = path.join(STORIES_DIR, file);
          const storyData = await fs.readFile(storyPath, 'utf8');
          const story = JSON.parse(storyData);
          
          // Return only metadata for the list
          return {
            storyId: story.storyId,
            metadata: story.metadata,
            imageCount: story.imageUrls?.length || 0,
            audioCount: story.audioUrls?.length || 0,
            sceneCount: story.scenes?.length || 0
          };
        } catch (error) {
          console.error(`Error reading story file ${file}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by creation date
    const validStories = stories
      .filter(story => story !== null)
      .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());

    return NextResponse.json({ stories: validStories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}
