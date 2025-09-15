import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stories as storiesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isValidUUID, checkRateLimit } from '@/lib/security';
import { r2Service } from '@/lib/r2';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Basic rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP, 30, 60000)) { // 30 requests per minute for story viewing
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { id: storyId } = await params;

    // Validate storyId format using security utility
    if (!isValidUUID(storyId)) {
      return NextResponse.json({ error: 'Invalid story ID format' }, { status: 400 });
    }

    // Read from database only
    const row = await db.select().from(storiesTable).where(eq(storiesTable.storyId, storyId)).limit(1);

    if (row.length === 0) {
      console.error('Story not found in database:', storyId);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const story = row[0];

    // Regenerate presigned URLs to fix expired ones
    try {
      // Decode URLs that might be double-encoded, but handle non-URL strings gracefully
      const decodedImageUrls = (story.imageUrls || []).map(url => {
        if (typeof url === 'string' && url.startsWith('http')) {
          try {
            return decodeURIComponent(url);
          } catch {
            return url; // Return original if decoding fails
          }
        }
        return url; // Return as-is if not a URL
      });

      const decodedAudioUrls = (story.audioUrls || []).map(url => {
        if (typeof url === 'string' && url.startsWith('http')) {
          try {
            return decodeURIComponent(url);
          } catch {
            return url; // Return original if decoding fails
          }
        }
        return url; // Return as-is if not a URL
      });

      const [regeneratedImageUrls, regeneratedAudioUrls] = await Promise.all([
        r2Service.regenerateUrls(decodedImageUrls, 'images'), // Images are in 'images' folder
        r2Service.regenerateUrls(decodedAudioUrls, 'generated') // Audio is in 'generated' folder
      ]);

      story.imageUrls = regeneratedImageUrls;
      story.audioUrls = regeneratedAudioUrls;
    } catch (error) {
      console.error('Error regenerating URLs:', error);
      // Continue with original URLs if regeneration fails
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Error fetching story from database:', error);
    return NextResponse.json({ error: 'Failed to fetch story' }, { status: 500 });
  }
}
