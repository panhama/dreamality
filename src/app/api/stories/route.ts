import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stories as storiesTable } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/security';

export async function GET(request: Request) {
  try {
    // Basic rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP, 20, 60000)) { // 20 requests per minute for story listing
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Read from database only - filter for public stories
    const rows = await db.select({
      storyId: storiesTable.storyId,
      metadata: storiesTable.metadata,
      imageUrls: storiesTable.imageUrls,
      audioUrls: storiesTable.audioUrls,
      scenes: storiesTable.scenes,
      createdAt: storiesTable.createdAt,
    }).from(storiesTable).where(eq(storiesTable.isPublic, true)).orderBy(desc(storiesTable.createdAt));

    const mapped = rows.map(r => ({
      storyId: r.storyId,
      metadata: r.metadata,
      imageCount: (r.imageUrls || []).length,
      audioCount: (r.audioUrls || []).length,
      sceneCount: (r.scenes || []).length,
    }));

    return NextResponse.json({ stories: mapped });
  } catch (error) {
    console.error('Error fetching stories from database:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}
