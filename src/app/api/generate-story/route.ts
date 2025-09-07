import {
  GoogleGenAI,
} from '@google/genai';
import { NextResponse } from 'next/server';
import mime from 'mime';
import { v4 as uuidv4 } from 'uuid';
import { generateText } from 'ai'; 
import { ElevenLabsService, elevenLabsService } from '@/lib/ai/elevenlabs';
import { google } from '@/lib/ai/ai';
import { db } from '@/lib/db';
import { stories as storiesTable } from '@/lib/db/schema';
import { minIOService } from '@/lib/minio';  


export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const dream = formData.get('dream') as string;
    const personality = formData.get('personality') as string;

    // NEW: Voice & story settings from frontend
    const voicePreset = formData.get('voicePreset') as string || 'warm_narrator';
    const energy = parseInt(formData.get('energy') as string || '70');
    const loudness = parseInt(formData.get('loudness') as string || '80');
    const guidance = parseInt(formData.get('guidance') as string || '35');
    const pace = formData.get('pace') as string || 'normal';

    const readingLevel = formData.get('readingLevel') as string || 'primary';
    const storyLength = formData.get('storyLength') as string || 'standard';
    const imageStyle = formData.get('imageStyle') as string || 'storybook';
    const isPublic = formData.get('isPublic') === 'true';

    const photo = formData.get('photo') as File | null;  // Optional upload - for character consistency
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
    // Step 1: Plan story arc - with enhanced settings
    const getSceneCount = (length: string) => {
      switch(length) {
        case 'short': return '3-4';
        case 'epic': return '8-10';
        default: return '6'; // standard
      }
    };

    const getReadingLevelPrompt = (level: string) => {
      switch(level) {
        case 'early': return 'Use simple, short words and very basic sentences. Perfect for beginning readers.';
        case 'preteen': return 'Use richer vocabulary and more complex sentence structures suitable for pre-teens.';
        default: return 'Use clear, engaging language with simple to moderate sentence structures.'; // primary
      }
    };

    const sceneCount = getSceneCount(storyLength);
    const readingPrompt = getReadingLevelPrompt(readingLevel);

    const planPrompt = `Create a ${sceneCount} scene uplifting story arc for a kid named ${name}, dream: ${dream}, personality: ${personality}. 

${readingPrompt}

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

    // Step 2: Write full story text with reading level consideration
    const storyPrompt = `Write an age-appropriate story based on this arc: ${JSON.stringify(scenes)}. Make ${name} the hero.

${readingPrompt}

Write engaging, magical content that brings the story to life while maintaining the specified reading level.`;
    const { text: storyText } = await generateText({ model: google('models/gemini-2.5-flash'), prompt: storyPrompt });

    // Clean the story text to remove markdown separators
    const cleanedStoryText = storyText
      .replace(/\*\*\*/g, '') // Remove *** separators
      .replace(/\n\n+/g, '\n\n') // Clean up extra line breaks
      .trim();

    // Step 3: Generate images with GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const imageUrls: string[] = [];
    let fileIndex = 0;
    
    for (const scene of scenes) {
      const getStylePrompt = (style: string) => {
        switch(style) {
          case 'watercolor': return 'in soft watercolor art style with gentle washes and flowing colors';
          case 'comic': return 'in comic book or cel-shaded animation style with bold lines and vibrant colors';
          case 'paper_cut': return 'in paper-cut collage style with layered textures and craft-like appearance';
          case 'realistic': return 'in realistic photographic style, high detail, professional photography, natural lighting, photorealistic quality';
          default: return 'in soft, cozy storybook illustration style with warm colors and gentle details'; // storybook
        }
      };

      const stylePrompt = getStylePrompt(imageStyle);
      const characterConsistencyPrompt = referenceImagePart ? 
        `Use the provided reference photo to maintain consistent appearance of ${name} throughout all scenes. Keep the same facial features, hair, and overall look as shown in the reference photo.` :
        `Create a consistent character design for ${name} that reflects their ${personality} personality.`;

      const prompt = imageStyle === 'realistic' 
        ? `Generate a realistic photograph for: ${scene.description}. 

Create a high-quality, professional photograph that looks like it was taken with a real camera. Use natural lighting, realistic textures, and photorealistic quality. Make it look like a real-world scene.

${characterConsistencyPrompt}

Scene details: Show ${name} as the main character in this scene. The photograph should be child-friendly, magical, and inspiring. Maintain visual consistency with previous scenes.

IMPORTANT: Generate the image in a perfect square (1:1) aspect ratio.`
        : `Generate an illustration for: ${scene.description}. 

Style: ${stylePrompt}

Character: ${characterConsistencyPrompt}

Scene details: Show ${name} as the main character in this scene. The illustration should be child-friendly, magical, and inspiring. Maintain visual consistency with previous scenes.

IMPORTANT: Generate the image in a perfect square (1:1) aspect ratio.`;
      
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
            
            // Upload to MinIO instead of saving locally
            const fullFileName = `${fileName}.${fileExtension}`;
            const publicUrl = await minIOService.uploadFile(
              buffer,
              fullFileName,
              inlineData.mimeType || 'image/png',
              'images'
            );
            
            imageUrls.push(publicUrl);
            console.log(`✓ Image uploaded to MinIO: ${fullFileName}`);
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

    // Step 4: Narrate with ElevenLabs using the new service with custom voice settings
    const audioUrls: string[] = [];
    const storyScenes = cleanedStoryText.split('\n\n').filter(scene => scene.trim());
    
    // Map voice presets to actual voice IDs and settings
    const getVoiceConfig = (preset: string) => {
      switch(preset) {
        case 'playful_hero':
          return {
            voiceId: ElevenLabsService.VOICES.FREYA, // Young, energetic female voice
            stability: Math.max(0.1, Math.min(1.0, (100 - energy) / 100)), // Higher energy = lower stability for more variation
            similarity_boost: 0.85,
            style: Math.max(0.1, Math.min(1.0, guidance / 100)), // Use guidance for expressiveness
            use_speaker_boost: true
          };
        case 'epic_guardian':
          return {
            voiceId: ElevenLabsService.VOICES.DANIEL, // Deep, cinematic male voice
            stability: 0.7, // More stable for epic narration
            similarity_boost: 0.8,
            style: Math.max(0.2, Math.min(1.0, guidance / 100)),
            use_speaker_boost: true
          };
        default: // warm_narrator
          return {
            voiceId: ElevenLabsService.VOICES.RACHEL, // Warm, gentle female voice
            stability: Math.max(0.4, Math.min(0.8, (100 - energy) / 150 + 0.4)), // Balanced stability
            similarity_boost: Math.max(0.7, Math.min(1.0, loudness / 100)),
            style: Math.max(0.1, Math.min(0.5, guidance / 200)), // More natural for bedtime stories
            use_speaker_boost: true
          };
      }
    };

    const voiceConfig = getVoiceConfig(voicePreset);
    
    // Use the new ElevenLabs service for better handling
    try {
      console.log('Generating story narration with enhanced ElevenLabs service...');
      console.log('Voice settings:', { voicePreset, energy, loudness, guidance, pace });
      
      const audioResults = await elevenLabsService.generateBatchAudio(storyScenes, {
        voiceId: voiceConfig.voiceId,
        model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
        voiceSettings: {
          stability: voiceConfig.stability,
          similarity_boost: voiceConfig.similarity_boost,
          style: voiceConfig.style,
          use_speaker_boost: voiceConfig.use_speaker_boost
        }
      });
      
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
            voiceId: voiceConfig.voiceId,
            model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
            voiceSettings: {
              stability: voiceConfig.stability,
              similarity_boost: voiceConfig.similarity_boost,
              style: voiceConfig.style,
              use_speaker_boost: voiceConfig.use_speaker_boost
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

    // Step 5: Save story to database only (no JSON fallback for compliance)
    const storyId = uuidv4();
    
    // Create story object
    const storyData = {
      storyId,
      storyText: cleanedStoryText,
      imageUrls,
      audioUrls,
      scenes,
      metadata: {
        name,
        dream,
        personality,
        createdAt: new Date().toISOString(),
        // Voice & Performance settings
        voicePreset,
        energy,
        loudness,
        guidance,
        pace,
        // Story options
        readingLevel,
        storyLength,
        imageStyle,
      }
    };

    // Save story to database only
    try {
      await db.insert(storiesTable).values({
        storyId,
        storyText: cleanedStoryText,
        imageUrls,
        audioUrls,
        scenes,
        metadata: storyData.metadata,
        isPublic,
      });
      console.log(`✓ Story saved to database: ${storyId}`);
    } catch (dbError) {
      console.error('❌ Database insertion failed:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save story to database',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      storyId, 
      storyText: cleanedStoryText, 
      imageUrls, 
      audioUrls,
      savedToDatabase: true
    });
  } catch (error) {
    console.error('Error generating story:', error);
    return NextResponse.json({ error: 'Failed to generate story' }, { status: 500 });
  }
}
