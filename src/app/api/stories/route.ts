import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { stories as storiesTable } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

const STORIES_DIR = path.join(process.cwd(), 'data', 'stories');

export async function GET() {
  try {
    // Prefer DB first
    try {
      const rows = await db.select({
        storyId: storiesTable.storyId,
        metadata: storiesTable.metadata,
        imageUrls: storiesTable.imageUrls,
        audioUrls: storiesTable.audioUrls,
        scenes: storiesTable.scenes,
        createdAt: storiesTable.createdAt,
      }).from(storiesTable).orderBy(desc(storiesTable.createdAt));

      const mapped = rows.map(r => ({
        storyId: r.storyId,
        metadata: r.metadata,
        imageCount: (r.imageUrls || []).length,
        audioCount: (r.audioUrls || []).length,
        sceneCount: (r.scenes || []).length,
      }));

      return NextResponse.json({ stories: mapped });
    } catch (dbErr) {
      console.warn('DB read failed, falling back to file system:', dbErr);
    }

    // Filesystem fallback
    await fs.mkdir(STORIES_DIR, { recursive: true });
    const files = await fs.readdir(STORIES_DIR);
    const storyFiles = files.filter(file => file.endsWith('.json'));

    const stories = await Promise.all(
      storyFiles.map(async (file) => {
        try {
          const storyPath = path.join(STORIES_DIR, file);
          const storyData = await fs.readFile(storyPath, 'utf8');
          const story = JSON.parse(storyData);

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

    const validStories = stories
      .filter(story => story !== null)
      .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());

    return NextResponse.json({ stories: validStories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}
