import { sql } from 'drizzle-orm';
import { db } from './index';

async function migrate() {
  try {
    console.log('Running database migration...');

    // Create the stories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id TEXT NOT NULL UNIQUE,
        story_text TEXT NOT NULL,
        image_urls JSONB NOT NULL,
        audio_urls JSONB NOT NULL,
        scenes JSONB NOT NULL,
        metadata JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // Create an index on story_id for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stories_story_id ON stories(story_id);
    `);

    // Create an index on created_at for sorting
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate();
