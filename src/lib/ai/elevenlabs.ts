// lib/ai/elevenlabs.ts
import { ElevenLabsClient } from "elevenlabs";
import { v4 as uuidv4 } from "uuid";
import { minIOService } from "@/lib/minio";

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
  outputFormat?: "mp3_44100_128" | "pcm_16000" | "pcm_22050" | "pcm_24000" | "pcm_44100" | "ulaw_8000";
  seed?: number;
  optimizeStreamingLatency?: 0 | 1 | 2 | 3 | 4;
}

export interface AudioResult {
  audioBuffer: Buffer;
  fileName: string;
  publicUrl: string;
  metadata: {
    voiceId: string;
    model: string;
    fileSize: number;
  };
}

export class ElevenLabsService {
  private client: ElevenLabsClient;

  static readonly VOICES = {
    ALLOY:  "pNInz6obpgDQGcFmaJgB",
    RACHEL: "21m00Tcm4TlvDq8ikWAM",
    DOMI:   "AZnzlk1XvdvUeBnXmlld",
    FINN:   "D38z5RcWu1voky8WS1ja",
    FREYA:  "jsCqWAovK2LkecY7zXl4",
    GRACE:  "oWAxZDx7w5VEj9dCyTzz",
    DANIEL: "onwK4e9ZLuTAKqWW03F9",
  };

  static readonly MODELS = {
    ELEVEN_V3: "eleven_v3",                 // best for [tags]
    MULTILINGUAL_V2: "eleven_multilingual_v2",
    TURBO_V2_5: "eleven_turbo_v2_5",
    ENGLISH_V1: "eleven_monolingual_v1",
  };

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ElevenLabs API key is required");
    this.client = new ElevenLabsClient({ apiKey: key });
  }

  async generateAudio(options: AudioGenerationOptions): Promise<AudioResult> {
    const {
      text,
      voiceId = ElevenLabsService.VOICES.RACHEL,
      model = ElevenLabsService.MODELS.TURBO_V2_5, // Changed from ELEVEN_V3 to TURBO_V2_5
      voiceSettings = { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
      outputFormat = "mp3_44100_128",
      seed,
      optimizeStreamingLatency = 2,
    } = options;

    console.log(`🎵 ElevenLabs generateAudio called:`);
    console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`   Voice: ${voiceId}`);
    console.log(`   Model: ${model}`);
    console.log(`   ENABLE_ELEVENLABS_AUDIO: ${process.env.ENABLE_ELEVENLABS_AUDIO}`);

    console.log(`🎵 ElevenLabs generateAudio called:`);
    console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`   Voice: ${voiceId}`);
    console.log(`   Model: ${model}`);
    console.log(`   ENABLE_ELEVENLABS_AUDIO: ${process.env.ENABLE_ELEVENLABS_AUDIO}`);

    if (process.env.ENABLE_ELEVENLABS_AUDIO !== "1") {
      throw new Error("ElevenLabs audio generation disabled (ENABLE_ELEVENLABS_AUDIO != 1).");
    }

    const audio = await this.client.textToSpeech.convert(voiceId, {
      text,
      model_id: model,
      voice_settings: voiceSettings,
      output_format: outputFormat,
      ...(seed != null ? { seed } : {}),
      optimize_streaming_latency: optimizeStreamingLatency,
    });

    // Normalize all response shapes to Buffer
    let audioBuffer: Buffer;
    if (audio instanceof Buffer) {
      audioBuffer = audio;
    } else if (audio && typeof audio === "object" && Symbol.asyncIterator in audio) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of audio as AsyncIterable<Uint8Array>) chunks.push(chunk);
      audioBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    } else if (audio && typeof audio === "object" && "arrayBuffer" in audio && typeof (audio as { arrayBuffer: unknown }).arrayBuffer === "function") {
      const arr = await (audio as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
      audioBuffer = Buffer.from(arr);
    } else {
      throw new Error(`Unsupported audio response type: ${typeof audio}`);
    }

    const fileName = `audio_${uuidv4()}.mp3`;
    
    try {
      const publicUrl = await minIOService.uploadFile(audioBuffer, fileName, "audio/mpeg", "audio");
      return {
        audioBuffer,
        fileName,
        publicUrl,
        metadata: { voiceId, model, fileSize: audioBuffer.length },
      };
    } catch (minioError) {
      console.warn("MinIO upload failed for audio, saving locally:", minioError);
      // Fallback: save to public/generated folder
      const fs = await import('fs/promises');
      const path = await import('path');
      const publicDir = path.join(process.cwd(), 'public', 'generated');
      await fs.mkdir(publicDir, { recursive: true });
      await fs.writeFile(path.join(publicDir, fileName), audioBuffer);
      const localUrl = `/generated/${fileName}`;
      console.log(`✓ Audio saved locally: ${localUrl}`);
      
      return {
        audioBuffer,
        fileName,
        publicUrl: localUrl,
        metadata: { voiceId, model, fileSize: audioBuffer.length },
      };
    }
  }

  async generateBatchAudio(texts: string[], options: Omit<AudioGenerationOptions, "text">): Promise<AudioResult[]> {
    const out: AudioResult[] = [];
    for (let i = 0; i < texts.length; i++) {
      try {
        const r = await this.generateAudio({ ...options, text: texts[i] });
        out.push(r);
        if (i < texts.length - 1) await new Promise((r) => setTimeout(r, 100));
      } catch (e) {
        console.error(`Audio ${i + 1}/${texts.length} failed:`, e);
        out.push({
          audioBuffer: Buffer.alloc(0),
          fileName: `error_${i}.mp3`,
          publicUrl: "",
          metadata: { voiceId: options.voiceId || ElevenLabsService.VOICES.RACHEL, model: options.model || ElevenLabsService.MODELS.ELEVEN_V3, fileSize: 0 },
        });
      }
    }
    return out;
  }

  async getVoices() { return (await this.client.voices.getAll()).voices; }
  async getVoice(voiceId: string) { return this.client.voices.get(voiceId); }
}
