import { GoogleGenAI, Modality } from "@google/genai";
import { NextResponse } from 'next/server';
import mime from 'mime';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateText } from 'ai';  // Vercel AI SDK v5: Use generateText, not generateContent
import { ElevenLabsClient } from 'elevenlabs';  // TTS
import { google } from '@/lib/ai/ai';  // Your AI setup (Note: May need update if using new SDK)

// ElevenLabs client
const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

// Temp dir for images (use Vercel Blob in production)
const TEMP_DIR = path.join(process.cwd(), 'public', 'generated');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const dream = formData.get('dream') as string;
    const personality = formData.get('personality') as string;
    const photo = formData.get('photo') as File | null;  // Optional upload

    // Step 1: Plan story arc (use LangGraph or simple prompt chain)
    // Simple version (no LangGraph):
    const planPrompt = `Create a 4-6 scene uplifting story arc for kid named ${name}, dream: ${dream}, personality: ${personality}. Output as JSON array of scenes.`;
    const { text: planText } = await generateText({ model: google('models/gemini-1.5-flash'), prompt: planPrompt });
    const scenes = JSON.parse(planText);  // e.g., [{title: 'Intro', description: '...'}]

    // Optional: LangGraph for agentic (planner → writer)
    // const graph = createGraph(...); // Define agents: planner, writer, etc. Invoke graph here.

    // Step 2: Write full story text
    const storyPrompt = `Write an age-appropriate story based on this arc: ${JSON.stringify(scenes)}. Make ${name} the hero.`;
    const { text: storyText } = await generateText({ model: google('models/gemini-1.5-flash'), prompt: storyPrompt });

    // Step 3: Generate images with Gemini 2.5 Flash (migrated to new SDK)
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const imageUrls: string[] = [];
    let fileIndex = 0;
    for (const scene of scenes) {
      const contentParts = [{ text: `Generate an image for: ${scene.description} with ${name} as hero (${personality}). Keep character consistent.` }];
      if (photo) {
        const photoBuffer = await photo.arrayBuffer();
        contentParts.push({ inlineData: { data: Buffer.from(photoBuffer).toString('base64'), mimeType: photo.type } });
      }

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash-image-preview',
        contents: [{ role: 'user', parts: contentParts }],
        generationConfig: { responseModalities: [Modality.IMAGE, Modality.TEXT] },  // Updated from responseMimeType: 'multipart/mixed'
      });

      for await (const chunk of response.stream) {
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          const ext = mime.getExtension(inlineData.mimeType || 'png');
          const fileName = `${uuidv4()}_${fileIndex++}.${ext}`;
          const buffer = Buffer.from(inlineData.data, 'base64');
          const filePath = path.join(TEMP_DIR, fileName);
          await fs.mkdir(TEMP_DIR, { recursive: true });
          await fs.writeFile(filePath, buffer);
          imageUrls.push(`/generated/${fileName}`);  // Serve from public
        }
      }
    }

    // Step 4: Narrate with ElevenLabs
    const audioUrls: string[] = [];
    for (const [i, sceneText] of storyText.split('\n\n').entries()) {  // Split by scenes
      const audio = await elevenlabs.textToSpeech.convert(
        'pNInz6obpgDQGcFmaJgB',  // Example heroic narrator voice; customize
        { text: sceneText, model_id: 'eleven_multilingual_v2' }  // Emotional tones
      );
      const audioFileName = `${uuidv4()}_${i}.mp3`;
      const audioPath = path.join(TEMP_DIR, audioFileName);
      await fs.writeFile(audioPath, audio);  // Audio is Buffer/stream
      audioUrls.push(`/generated/${audioFileName}`);
    }

    // Step 5: Return (use unique ID for story viewer)
    const storyId = uuidv4();
    // Save to DB/Payload CMS if using; here, just return data
    return NextResponse.json({ storyId, storyText, imageUrls, audioUrls });
  } catch (error) {
    console.error('Error generating story:', error);
    return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 });
  }
}