import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';  // Vercel AI SDK v5 core

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Helper to generate story/text (non-image)
export async function generateStory(prompt: string) {
  const { response } = await generateText({
    model: google('models/gemini-2.5-flash'),
    prompt,
  });
  return response;
}