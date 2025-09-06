import { elevenLabsService, ElevenLabsService } from '@/lib/ai/elevenlabs';

/**
 * Example usage of the enhanced ElevenLabs service
 */

// Basic audio generation
export async function generateSimpleAudio(text: string) {
  return await elevenLabsService.generateAudio({
    text,
    voiceId: ElevenLabsService.VOICES.RACHEL,
    model: ElevenLabsService.MODELS.TURBO_V2_5
  });
}

// Conversational audio with context
export async function generateConversationalAudio(
  text: string, 
  previousText?: string, 
  nextText?: string
) {
  return await elevenLabsService.generateConversationalAudio({
    text,
    previousText,
    nextText,
    voiceId: ElevenLabsService.VOICES.DANIEL,
    model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
    enableSSML: true,
    optimizeStreamingLatency: 2
  });
}

// Batch audio generation for stories
export async function generateStoryAudio(storyScenes: string[]) {
  return await elevenLabsService.generateBatchAudio(storyScenes, {
    voiceId: ElevenLabsService.VOICES.GRACE,
    model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
    voiceSettings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true
    },
    outputFormat: 'mp3_44100_128'
  });
}

// Character dialogue generation with different voices
export async function generateCharacterDialogue(dialogues: Array<{text: string, character: 'narrator' | 'hero' | 'villain'}>) {
  const results = [];
  
  for (const dialogue of dialogues) {
    let voiceId: string;
    let voiceSettings;
    
    switch (dialogue.character) {
      case 'narrator':
        voiceId = ElevenLabsService.VOICES.RACHEL;
        voiceSettings = { stability: 0.6, similarity_boost: 0.8, style: 0.2 };
        break;
      case 'hero':
        voiceId = ElevenLabsService.VOICES.FINN;
        voiceSettings = { stability: 0.5, similarity_boost: 0.7, style: 0.4 };
        break;
      case 'villain':
        voiceId = ElevenLabsService.VOICES.DANIEL;
        voiceSettings = { stability: 0.7, similarity_boost: 0.9, style: 0.6 };
        break;
      default:
        voiceId = ElevenLabsService.VOICES.ALLOY;
        voiceSettings = { stability: 0.5, similarity_boost: 0.8, style: 0.3 };
    }
    
    const result = await elevenLabsService.generateAudio({
      text: dialogue.text,
      voiceId,
      voiceSettings,
      model: ElevenLabsService.MODELS.MULTILINGUAL_V2
    });
    
    results.push({
      ...result,
      character: dialogue.character
    });
  }
  
  return results;
}

// Custom voice settings for different emotions
export const EMOTION_PRESETS = {
  happy: {
    stability: 0.4,
    similarity_boost: 0.7,
    style: 0.6,
    use_speaker_boost: true
  },
  sad: {
    stability: 0.8,
    similarity_boost: 0.9,
    style: 0.2,
    use_speaker_boost: false
  },
  excited: {
    stability: 0.3,
    similarity_boost: 0.6,
    style: 0.8,
    use_speaker_boost: true
  },
  calm: {
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.1,
    use_speaker_boost: false
  },
  mysterious: {
    stability: 0.6,
    similarity_boost: 0.9,
    style: 0.4,
    use_speaker_boost: true
  }
};

// Generate audio with specific emotion
export async function generateEmotionalAudio(text: string, emotion: keyof typeof EMOTION_PRESETS) {
  return await elevenLabsService.generateAudio({
    text,
    voiceId: ElevenLabsService.VOICES.RACHEL,
    model: ElevenLabsService.MODELS.TURBO_V2_5,
    voiceSettings: EMOTION_PRESETS[emotion]
  });
}

// Voice cloning and custom voice usage (if you have custom voices)
export async function generateWithCustomVoice(text: string, customVoiceId: string) {
  // First check if the voice exists
  try {
    const voiceDetails = await elevenLabsService.getVoice(customVoiceId);
    console.log('Using custom voice:', voiceDetails.name);
    
    return await elevenLabsService.generateAudio({
      text,
      voiceId: customVoiceId,
      model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
      voiceSettings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true
      }
    });
  } catch (error) {
    console.error('Custom voice not found, falling back to default:', error);
    return await generateSimpleAudio(text);
  }
}

// Utility function for voice selection based on content
export function selectVoiceForContent(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('narrator') || lowerContent.includes('once upon')) {
    return ElevenLabsService.VOICES.RACHEL; // Calm female narrator
  } else if (lowerContent.includes('hero') || lowerContent.includes('brave')) {
    return ElevenLabsService.VOICES.FINN; // Young male hero
  } else if (lowerContent.includes('villain') || lowerContent.includes('evil')) {
    return ElevenLabsService.VOICES.DANIEL; // Deep male villain
  } else if (lowerContent.includes('child') || lowerContent.includes('young')) {
    return ElevenLabsService.VOICES.FREYA; // Young female
  } else {
    return ElevenLabsService.VOICES.GRACE; // Default gentle female
  }
}

// Advanced batch processing with different voices
export async function generateAdvancedStoryAudio(story: {
  scenes: Array<{
    text: string;
    type: 'narration' | 'dialogue' | 'description';
    character?: string;
    emotion?: keyof typeof EMOTION_PRESETS;
  }>;
}) {
  const results = [];
  
  for (let i = 0; i < story.scenes.length; i++) {
    const scene = story.scenes[i];
    const previousScene = i > 0 ? story.scenes[i - 1] : null;
    const nextScene = i < story.scenes.length - 1 ? story.scenes[i + 1] : null;
    
    const voiceId = selectVoiceForContent(scene.text);
    const voiceSettings = scene.emotion ? EMOTION_PRESETS[scene.emotion] : {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true
    };
    
    try {
      const result = await elevenLabsService.generateConversationalAudio({
        text: scene.text,
        previousText: previousScene?.text,
        nextText: nextScene?.text,
        voiceId,
        voiceSettings,
        model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
        enableSSML: scene.type === 'dialogue',
        optimizeStreamingLatency: 2
      });
      
      results.push({
        ...result,
        sceneIndex: i,
        sceneType: scene.type,
        character: scene.character,
        emotion: scene.emotion
      });
      
    } catch (error) {
      console.error(`Error generating audio for scene ${i}:`, error);
      results.push(null);
    }
  }
  
  return results.filter(result => result !== null);
}
