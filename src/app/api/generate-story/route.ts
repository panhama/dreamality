import {
  GoogleGenAI,
} from '@google/genai';
import { NextResponse } from 'next/server';
import mime from 'mime';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateText } from 'ai'; 
import { ElevenLabsClient } from 'elevenlabs';  // TTS
import { google } from '@/lib/ai/ai';  
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

    const photo = formData.get('photo') as File | null;  // Optional upload - for future use
    // Use photo for character consistency in image generation
    let referenceImagePart: { inlineData: { mimeType: string; data: string } } | null = null;
    try {
      if (photo && typeof (photo).arrayBuffer === 'function' && (photo).size > 0) {
        const ab = await (photo).arrayBuffer();
        const b64 = Buffer.from(ab).toString('base64');
        const mimeType = (photo).type || mime.getType((photo).name || '') || 'image/jpeg';
        referenceImagePart = {
          inlineData: {
            mimeType,
            data: b64,
          },
        };
      }
    } catch (err) {
      console.warn('Could not process reference photo for consistency:', err);
    }
    const planPrompt = `Create a 4-6 scene uplifting story arc for kid named ${name}, dream: ${dream}, personality: ${personality}. Output as JSON array of scenes.`;
    const { text: planText } = await generateText({ model: google('models/gemini-2.5-flash'), prompt: planPrompt });
    const scenes = JSON.parse(planText);  // e.g., [{title: 'Intro', description: '...'}]

    // Optional: LangGraph for agentic (planner → writer)
    // const graph = createGraph(...); // Define agents: planner, writer, etc. Invoke graph here.

    // Step 2: Write full story text
    const storyPrompt = `Write an age-appropriate story based on this arc: ${JSON.stringify(scenes)}. Make ${name} the hero.`;
    const { text: storyText } = await generateText({ model: google('models/gemini-2.5-flash'), prompt: storyPrompt });

    // Step 3: Generate images with GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const imageUrls: string[] = [];
    let fileIndex = 0;
    for (const scene of scenes) {
      const prompt = `Generate an image for: ${scene.description} with ${name} as hero (${personality}). Use the reference photo to keep the character's appearance consistent across scenes.`;
      
      try {
        const config = {
          responseModalities: [
            'IMAGE',
            'TEXT',
          ],
        };
        const model = 'gemini-2.5-flash-image-preview';
        const parts: any[] = [];
        if (referenceImagePart) parts.push(referenceImagePart);
        parts.push({ text: prompt });

        const contents = [
          {
            role: 'user',
            parts,
          },
        ];

        const response = await ai.models.generateContentStream({
          model,
          config,
          contents,
        });

        for await (const chunk of response) {
          if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
            continue;
          }
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const fileName = `${uuidv4()}_${fileIndex++}`;
            const inlineData = chunk.candidates[0].content.parts[0].inlineData;
            const fileExtension = mime.getExtension(inlineData.mimeType || '');
            const buffer = Buffer.from(inlineData.data || '', 'base64');
            
            const filePath = path.join(TEMP_DIR, `${fileName}.${fileExtension}`);
            await fs.mkdir(TEMP_DIR, { recursive: true });
            await fs.writeFile(filePath, buffer);
            imageUrls.push(`/generated/${fileName}.${fileExtension}`);
          } else {
            console.log(chunk.text);
          }
        }
      } catch (error) {
        console.error('Error generating image for scene:', error);
        // Add a placeholder on error
        imageUrls.push('/placeholder-image.png');
      }
    }

    // Step 4: Narrate with ElevenLabs
    const audioUrls: string[] = [];
    const storyScenes = storyText.split('\n\n').filter(scene => scene.trim());  // Split by scenes and filter empty
    
    for (const [i, sceneText] of storyScenes.entries()) {
      try {
        const audio = await elevenlabs.textToSpeech.convert(
          'pNInz6obpgDQGcFmaJgB',  // Example heroic narrator voice; customize
          { 
            text: sceneText, 
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          }
        );
        
        const audioFileName = `${uuidv4()}_${i}.mp3`;
        const audioPath = path.join(TEMP_DIR, audioFileName);
        await fs.mkdir(TEMP_DIR, { recursive: true });
        
        // Handle audio as stream/buffer
        if (audio instanceof Buffer) {
          await fs.writeFile(audioPath, audio);
        } else {
          // If it's a readable stream, convert to buffer first
          const chunks: Buffer[] = [];
          const audioStream = audio as NodeJS.ReadableStream;
          audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
          await new Promise((resolve, reject) => {
            audioStream.on('end', resolve);
            audioStream.on('error', reject);
          });
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(audioPath, buffer);
        }
        
        audioUrls.push(`/generated/${audioFileName}`);
      } catch (error) {
        console.error('Error generating audio for scene:', error);
        // Add a placeholder on error or skip
        audioUrls.push('');
      }
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
