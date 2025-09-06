import { NextResponse } from 'next/server';
import { elevenLabsService, ElevenLabsService } from '@/lib/ai/elevenlabs';

export async function POST(req: Request) {
  try {
    const { text, voiceId, model, prompt } = await req.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('Generating audio with ElevenLabs v3 features...');
    console.log('Request:', { text: text.substring(0, 100), voiceId, model, prompt });

    // Use the enhanced ElevenLabs service
    const result = await elevenLabsService.generateAudio({
      text: text,
      voiceId: voiceId || ElevenLabsService.VOICES.RACHEL,
      model: model || ElevenLabsService.MODELS.TURBO_V2_5,
      voiceSettings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true
      },
      outputFormat: 'mp3_44100_128'
    });

    return NextResponse.json({
      success: true,
      audioUrl: result.publicUrl,
      fileName: result.fileName,
      metadata: result.metadata,
      message: 'Audio generated successfully with ElevenLabs v3 features'
    });

  } catch (error) {
    console.error('Error in audio generation API:', error);
    return NextResponse.json({ 
      error: 'Audio generation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get available voices
    const voices = await elevenLabsService.getVoices();
    
    return NextResponse.json({
      success: true,
      voices: voices?.map(voice => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        preview_url: voice.preview_url
      })) || [],
      predefinedVoices: ElevenLabsService.VOICES,
      models: ElevenLabsService.MODELS,
      message: 'Available voices and models'
    });

  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch voices',
      predefinedVoices: ElevenLabsService.VOICES,
      models: ElevenLabsService.MODELS
    }, { status: 200 }); // Still return predefined voices even if API fails
  }
}
