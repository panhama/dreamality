// Quick test for ElevenLabs fix
import { ElevenLabsService } from "./lib/ai/elevenlabs";

// Load environment variables
import { config } from "dotenv";
config({ path: "../.env" });

async function test() {
  console.log("🧪 Quick ElevenLabs test...");

  const elevenLabs = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
  try {
    const result = await elevenLabs.generateAudio({
      text: "This is a test of the fixed ElevenLabs audio generation.",
      voiceId: ElevenLabsService.VOICES.RACHEL,
      model: ElevenLabsService.MODELS.ELEVEN_V3,
      voiceSettings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      },
      outputFormat: "mp3_44100_128"
    });
    console.log("✅ SUCCESS: Audio generated!");
    console.log(`   File: ${result.fileName}`);
    console.log(`   Size: ${result.metadata.fileSize} bytes`);
    console.log(`   URL: ${result.publicUrl}`);
  } catch (error) {
    console.log("❌ FAILED:", error);
  }
}

test();
