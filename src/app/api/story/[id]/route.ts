import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { stories as storiesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const STORIES_DIR = path.join(process.cwd(), 'data', 'stories');

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;

    // Try DB first
    try {
      const row = await db.select().from(storiesTable).where(eq(storiesTable.storyId, storyId)).limit(1);
      if (row.length > 0) {
        return NextResponse.json(row[0]);
      }
    } catch (dbErr) {
      console.warn('DB read failed, falling back to file system:', dbErr);
    }

    // Filesystem fallback
    const storyPath = path.join(STORIES_DIR, `${storyId}.json`);
    try {
      const storyData = await fs.readFile(storyPath, 'utf8');
      const story = JSON.parse(storyData);
      return NextResponse.json(story);
    } catch {
      console.error('Story not found:', storyId);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 });
  }
}
