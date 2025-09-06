import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from './index';
import { stories } from './schema';

async function seed() {
  try {
    const STORIES_DIR = path.join(process.cwd(), 'data', 'stories');
    await fs.mkdir(STORIES_DIR, { recursive: true });

    const files = await fs.readdir(STORIES_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    let inserted = 0;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(STORIES_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const obj = JSON.parse(content);

        // Insert into DB, skip if already exists
        try {
          await db.insert(stories).values({
            storyId: obj.storyId,
            storyText: obj.storyText,
            imageUrls: obj.imageUrls || [],
            audioUrls: obj.audioUrls || [],
            scenes: obj.scenes || [],
            metadata: obj.metadata || {},
          });
          inserted++;
          console.log(`Inserted story ${obj.storyId}`);
        } catch (err) {
          // Likely unique violation or other issue - skip
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`Skipping ${obj.storyId}:`, msg);
        }
      } catch (err) {
        console.error(`Failed to process file ${file}:`, err);
      }
    }

    console.log(`Seed complete — inserted ${inserted} story(ies).`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
