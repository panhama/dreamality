import { sql } from 'drizzle-orm';
import { db } from './index';

async function addIsPublicColumn() {
  try {
    console.log('Adding isPublic column to stories table...');

    // Add the isPublic column with default value of false
    await db.execute(sql`
      ALTER TABLE stories 
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE NOT NULL;
    `);

    // Create an index on is_public for filtering public stories
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stories_is_public ON stories(is_public);
    `);

    console.log('isPublic column migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

addIsPublicColumn();
