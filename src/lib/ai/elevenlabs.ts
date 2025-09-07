import { ElevenLabsClient } from 'elevenlabs';
import { v4 as uuidv4 } from 'uuid';
import { minIOService } from '@/lib/minio';

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface AudioGenerationOptions {
  text: string;
  voiceId?: string;
  model?: string;
  voiceSettings?: VoiceSettings;
  outputFormat?: 'mp3_44100_128' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100' | 'ulaw_8000';
  previousText?: string; // For conversational continuity
  nextText?: string; // For conversational continuity
  seed?: number; // For reproducible results
}

export interface ConversationalOptions extends AudioGenerationOptions {
  conversationId?: string;
  enableSSML?: boolean;
  optimizeStreamingLatency?: number; // 0-4, higher = faster but lower quality
}

export interface AudioResult {
  audioBuffer: Buffer;
  fileName: string;
  filePath: string;
  publicUrl: string;
  metadata: {
    voiceId: string;
    model: string;
    duration?: number;
    fileSize: number;
  };
}

export class ElevenLabsService {
  private client: ElevenLabsClient;

  // Popular voice IDs for quick access
  static readonly VOICES = {
    ALLOY: 'pNInz6obpgDQGcFmaJgB', // Male, heroic narrator
    RACHEL: '21m00Tcm4TlvDq8ikWAM', // Female, calm narrator
    DOMI: 'AZnzlk1XvdvUeBnXmlld', // Female, strong narrator
    FINN: 'D38z5RcWu1voky8WS1ja', // Male, young narrator
    FREYA: 'jsCqWAovK2LkecY7zXl4', // Female, young narrator
    GRACE: 'oWAxZDx7w5VEj9dCyTzz', // Female, gentle narrator
    DANIEL: 'onwK4e9ZLuTAKqWW03F9', // Male, deep narrator
  };

  // Model options
  static readonly MODELS = {
    TURBO_V2_5: 'eleven_turbo_v2_5', // Fastest, good quality
    MULTILINGUAL_V2: 'eleven_multilingual_v2', // Best for multiple languages
    ENGLISH_V1: 'eleven_monolingual_v1', // Best English quality
    TURBO_V2: 'eleven_turbo_v2', // Fast, good quality
  };

  constructor(apiKey?: string) {
    if (!apiKey && !process.env.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key is required');
    }
    
    this.client = new ElevenLabsClient({ 
      apiKey: apiKey || process.env.ELEVENLABS_API_KEY! 
    });
    
    // No longer need local output directory since we're using MinIO
  }

  /**
   * Generate audio using ElevenLabs TTS (supports v3 features)
   */
  async generateAudio(options: AudioGenerationOptions): Promise<AudioResult> {
    const {
      text,
      voiceId = ElevenLabsService.VOICES.ALLOY,
      model = ElevenLabsService.MODELS.TURBO_V2_5,
      voiceSettings = {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      },
      outputFormat = 'mp3_44100_128',
      seed
    } = options;

    if (process.env.ENABLE_ELEVENLABS_AUDIO !== '1') {
      throw new Error('ElevenLabs audio generation is disabled to save tokens and money.');
    }

    try {
      console.log(`Generating audio with voice: ${voiceId}, model: ${model}`);

      // Use the latest TTS API with v3 features
      const audio = await this.client.textToSpeech.convert(voiceId, {
        text,
        model_id: model,
        voice_settings: voiceSettings,
        output_format: outputFormat,
        ...(seed && { seed }) // Add seed for reproducible results
      });

      // Generate unique filename
      const fileName = `audio_${uuidv4()}.mp3`;

      // Handle different response types
      let audioBuffer: Buffer;
      
      if (audio instanceof Buffer) {
        audioBuffer = audio;
      } else if (audio && typeof audio === 'object' && Symbol.asyncIterator in audio) {
        // Handle async iterable responses
        const chunks: Uint8Array[] = [];
        for await (const chunk of audio as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        audioBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
      } else if (audio && typeof audio === 'object' && 'arrayBuffer' in audio) {
        // Handle Response-like objects
        const arrayBuffer = await (audio as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      } else {
        throw new Error(`Unsupported audio response type: ${typeof audio}`);
      }

      // Upload to MinIO instead of saving locally
      const publicUrl = await minIOService.uploadFile(
        audioBuffer,
        fileName,
        'audio/mpeg',
        'audio'
      );

      console.log(`✓ Audio uploaded to MinIO: ${fileName} (${audioBuffer.length} bytes)`);

      return {
        audioBuffer,
        fileName,
        filePath: '', // Not used anymore since we're using MinIO
        publicUrl,
        metadata: {
          voiceId,
          model,
          fileSize: audioBuffer.length
        }
      };

    } catch (error) {
      console.error('Error generating audio:', error);
      throw new Error(`Audio generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate conversational audio with v3 features (streaming, context awareness)
   */
  async generateConversationalAudio(options: ConversationalOptions): Promise<AudioResult> {
    const {
      previousText,
      nextText,
      conversationId,
      optimizeStreamingLatency = 2,
      enableSSML = false,
      ...baseOptions
    } = options;

    // Enhanced options for conversational context
    const conversationalOptions: AudioGenerationOptions = {
      ...baseOptions,
      // Add context for better conversational flow
      text: enableSSML ? this.wrapWithSSML(baseOptions.text) : baseOptions.text,
    };

    // For conversational continuity, you can implement custom logic here
    // This could include maintaining conversation state, voice consistency, etc.
    console.log('Conversational context:', { previousText, nextText, conversationId, optimizeStreamingLatency });
    
    return this.generateAudio(conversationalOptions);
  }

  /**
   * Generate multiple audio files in batch
   */
  async generateBatchAudio(textArray: string[], options: Omit<AudioGenerationOptions, 'text'>): Promise<AudioResult[]> {
    const results: AudioResult[] = [];
    
    for (let i = 0; i < textArray.length; i++) {
      try {
        console.log(`Generating audio ${i + 1}/${textArray.length}`);
        const result = await this.generateAudio({
          ...options,
          text: textArray[i]
        });
        results.push(result);
        
        // Small delay to avoid rate limiting
        if (i < textArray.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error generating audio for text ${i + 1}:`, error);
        // Continue with other texts, but log the error
        results.push({
          audioBuffer: Buffer.alloc(0),
          fileName: `error_${i}.mp3`,
          filePath: '',
          publicUrl: '',
          metadata: {
            voiceId: options.voiceId || ElevenLabsService.VOICES.ALLOY,
            model: options.model || ElevenLabsService.MODELS.TURBO_V2_5,
            fileSize: 0
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices() {
    try {
      const voices = await this.client.voices.getAll();
      return voices.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw new Error('Failed to fetch available voices');
    }
  }

  /**
   * Get voice details by ID
   */
  async getVoice(voiceId: string) {
    try {
      const voice = await this.client.voices.get(voiceId);
      return voice;
    } catch (error) {
      console.error(`Error fetching voice ${voiceId}:`, error);
      throw new Error(`Failed to fetch voice details for ${voiceId}`);
    }
  }

  /**
   * Wrap text with SSML for enhanced speech control
   */
  private wrapWithSSML(text: string): string {
    // Basic SSML wrapper - can be enhanced based on needs
    return `<speak>${text}</speak>`;
  }

  /**
   * Clean up old audio files (MinIO cleanup would be implemented separately)
   */
  async cleanupOldFiles(_maxAgeHours: number = 24): Promise<number> {
    // MinIO cleanup would require listing objects and deleting old ones
    // This is a placeholder - implement MinIO cleanup if needed
    console.log(`MinIO cleanup not implemented yet (would clean files older than ${_maxAgeHours} hours)`);
    return 0;
  }
}

// Export singleton instance
export const elevenLabsService = new ElevenLabsService();

// Export utility functions
export const generateNarration = (text: string, options?: Partial<AudioGenerationOptions>) => 
  elevenLabsService.generateAudio({ text, ...options });

export const generateDialogue = (text: string, voiceId: string, options?: Partial<AudioGenerationOptions>) =>
  elevenLabsService.generateAudio({ text, voiceId, ...options });

export const generateStoryNarration = (storyScenes: string[], narratorVoice?: string) =>
  elevenLabsService.generateBatchAudio(storyScenes, { 
    voiceId: narratorVoice || ElevenLabsService.VOICES.RACHEL,
    model: ElevenLabsService.MODELS.MULTILINGUAL_V2,
    voiceSettings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    }
  });
