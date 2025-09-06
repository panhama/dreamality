import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const STORIES_DIR = path.join(process.cwd(), 'data', 'stories');

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;
    const storyPath = path.join(STORIES_DIR, `${storyId}.json`);
    
    // Check if story exists
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
