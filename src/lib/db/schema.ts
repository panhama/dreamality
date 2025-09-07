import { pgTable, text, timestamp, json, uuid, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  storyId: text('story_id').notNull().unique(),
  storyText: text('story_text').notNull(),
  imageUrls: json('image_urls').$type<string[]>().notNull(),
  audioUrls: json('audio_urls').$type<string[]>().notNull(),
  scenes: json('scenes').$type<{ title: string; description: string }[]>().notNull(),
  metadata: json('metadata').$type<{
    name: string;
    dream: string;
    personality: string;
    createdAt: string;
    // Voice & Performance settings
    voicePreset?: string;
    energy?: number;
    loudness?: number;
    guidance?: number;
    pace?: string;
    // Story options
    readingLevel?: string;
    storyLength?: string;
    imageStyle?: string;
  }>().notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
