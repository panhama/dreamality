import {
  GoogleGenAI,
} from '@google/genai';
import { NextResponse } from 'next/server';
import mime from 'mime';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateText } from 'ai'; 
import { generateStoryNarration, ElevenLabsService, elevenLabsService } from '@/lib/ai/elevenlabs';
import { google } from '@/lib/ai/ai';
import { db } from '@/lib/db';
import { stories as storiesTable } from '@/lib/db/schema';  
// ElevenLabs service (no longer needed - using the new service)
// const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

// Temp dir for images (use Vercel Blob in production)
const TEMP_DIR = path.join(process.cwd(), 'public', 'generated');
const STORIES_DIR = path.join(process.cwd(), 'data', 'stories');

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
    // Step 1: Plan story arc - with better JSON handling
    const planPrompt = `Create a 4-6 scene uplifting story arc for a kid named ${name}, dream: ${dream}, personality: ${personality}. 

Output ONLY a valid JSON array of scenes in this exact format (no markdown, no explanation):
[{"title": "Scene Title", "description": "Scene description"}, {"title": "Scene Title 2", "description": "Scene description 2"}]`;
    
    const { text: planText } = await generateText({ model: google('models/gemini-2.5-flash'), prompt: planPrompt });
    
    // Clean the response to handle markdown code blocks
    let cleanedPlanText = planText.trim();
    if (cleanedPlanText.startsWith('```json')) {
      cleanedPlanText = cleanedPlanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedPlanText.startsWith('```')) {
      cleanedPlanText = cleanedPlanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    let scenes;
    try {
      scenes = JSON.parse(cleanedPlanText);
    } catch {
      console.error('Failed to parse scenes JSON:', cleanedPlanText);
      // Fallback to default scenes structure
      scenes = [
        { title: "The Beginning", description: `${name} discovers their dream of ${dream}` },
        { title: "The Challenge", description: `${name} faces obstacles but shows their ${personality} nature` },
        { title: "The Journey", description: `${name} embarks on an adventure to achieve their dream` },
        { title: "The Growth", description: `${name} learns important lessons and grows stronger` },
        { title: "The Success", description: `${name} achieves their dream through determination and ${personality} traits` }
      ];
    }

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
    
    // Ensure the generated directory exists
    await fs.mkdir(TEMP_DIR, { recursive: true });
    
    for (const scene of scenes) {
      const prompt = `Generate an image for: ${scene.description} with ${name} as hero (${personality}). Use the reference photo to keep the character's appearance consistent across scenes.`;
      
      try {
        console.log(`Generating image for scene ${fileIndex}: ${scene.title}`);
        const config = {
          responseModalities: [
            'IMAGE',
            'TEXT',
          ],
        };
        const model = 'gemini-2.5-flash-image-preview';
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
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

        let imageGenerated = false;
        for await (const chunk of response) {
          if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
            continue;
          }
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const fileName = `${uuidv4()}_${fileIndex++}`;
            const inlineData = chunk.candidates[0].content.parts[0].inlineData;
            const fileExtension = mime.getExtension(inlineData.mimeType || '') || 'png';
            const buffer = Buffer.from(inlineData.data || '', 'base64');
            
            const filePath = path.join(TEMP_DIR, `${fileName}.${fileExtension}`);
            await fs.writeFile(filePath, buffer);
            imageUrls.push(`/generated/${fileName}.${fileExtension}`);
            console.log(`✓ Image saved: ${fileName}.${fileExtension}`);
            imageGenerated = true;
            break; // Take only the first image from the stream
          } else if (chunk.text) {
            console.log('Generated text:', chunk.text);
          }
        }
        
        if (!imageGenerated) {
          console.log('No image generated for scene, using placeholder');
          imageUrls.push('/placeholder-image.svg');
        }
      } catch (error) {
        console.error('Error generating image for scene:', error);
        // Add a placeholder on error
        imageUrls.push('/placeholder-image.svg');
      }
    }

    // Step 4: Narrate with ElevenLabs using the new service
    const audioUrls: string[] = [];
    const storyScenes = storyText.split('\n\n').filter(scene => scene.trim());
    
    // Use the new ElevenLabs service for better handling
    try {
      console.log('Generating story narration with enhanced ElevenLabs service...');
      const audioResults = await generateStoryNarration(storyScenes, ElevenLabsService.VOICES.RACHEL);
      
      for (const result of audioResults) {
        if (result.publicUrl && result.audioBuffer.length > 0) {
          audioUrls.push(result.publicUrl);
          console.log(`✓ Audio generated: ${result.fileName}`);
        } else {
          console.log('Empty audio result, adding placeholder');
          audioUrls.push('');
        }
      }
    } catch (error) {
      console.error('Error generating batch audio:', error);
      // Fallback to individual generation if batch fails
      console.log('Falling back to individual audio generation...');
      
      for (const [i, sceneText] of storyScenes.entries()) {
        try {
          console.log(`Generating individual audio for scene ${i + 1}`);
          const audioResult = await elevenLabsService.generateAudio({
            text: sceneText,
            voiceId: ElevenLabsService.VOICES.RACHEL,
            model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
            voiceSettings: {
              stability: 0.6,
              similarity_boost: 0.8,
              style: 0.2,
              use_speaker_boost: true
            }
          });
          
          audioUrls.push(audioResult.publicUrl);
          console.log(`✓ Individual audio saved: ${audioResult.fileName}`);
        } catch (individualError) {
          console.error(`Error generating individual audio for scene ${i + 1}:`, individualError);
          audioUrls.push('');
        }
      }
    }

    // Step 5: Save story to database and return
    const storyId = uuidv4();
    
    // Create story object
    const storyData = {
      storyId,
      storyText,
      imageUrls,
      audioUrls,
      scenes,
      metadata: {
        name,
        dream,
        personality,
        createdAt: new Date().toISOString()
      }
    };

    // Save story to database
    try {
      await db.insert(storiesTable).values({
        storyId,
        storyText,
        imageUrls,
        audioUrls,
        scenes,
        metadata: storyData.metadata,
      });
      console.log(`✓ Story saved to database: ${storyId}`);
    } catch (dbError) {
      console.error('Error saving story to database:', dbError);
      // Continue without failing - we still want to return the story
    }

    // Also save to JSON file as backup
    try {
      await fs.mkdir(STORIES_DIR, { recursive: true });
      const storyPath = path.join(STORIES_DIR, `${storyId}.json`);
      await fs.writeFile(storyPath, JSON.stringify(storyData, null, 2));
      console.log(`✓ Story saved to file backup: ${storyId}`);
    } catch (error) {
      console.error('Error saving story to file backup:', error);
      // Continue without failing - we still want to return the story
    }

    return NextResponse.json({ storyId, storyText, imageUrls, audioUrls });
  } catch (error) {
    console.error('Error generating story:', error);
    return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 });
  }
}
