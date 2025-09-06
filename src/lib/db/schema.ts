import { pgTable, text, timestamp, json, uuid } from 'drizzle-orm/pg-core';
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
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
