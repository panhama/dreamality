import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stories as storiesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;

    // Read from database only
    const row = await db.select().from(storiesTable).where(eq(storiesTable.storyId, storyId)).limit(1);

    if (row.length === 0) {
      console.error('Story not found in database:', storyId);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    return NextResponse.json(row[0]);
  } catch (error) {
    console.error('Error fetching story from database:', error);
    return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 });
  }
}
