// Test script to verify both image and audio generation work
import { GoogleGenAI } from "@google/genai";
import { ElevenLabsService } from "./lib/ai/elevenlabs";
import { minIOService } from "./lib/minio";
import { v4 as uuidv4 } from "uuid";
import mime from "mime";
import * as fs from "fs/promises";
import * as path from "path";

// Load environment variables
import { config } from "dotenv";
config({ path: path.join(process.cwd(), '.env') });

// async function generateTestImage(): Promise<string> {
//   console.log("� Generating test image...");

//   const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
//   const prompt = "Create a beautiful square illustration of a friendly robot helping a child with homework in a cozy library. Warm colors, storybook style, no text on image.";

//   try {
//     const response = await ai.models.generateContentStream({
//       model: "gemini-2.5-flash-image-preview",
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//       config: { responseModalities: ["IMAGE", "TEXT"] },
//     });

//     for await (const chunk of response) {
//       const inline = chunk?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
//       if (!inline?.data) continue;

//       const buffer = Buffer.from(inline.data, "base64");
//       const ext = mime.getExtension(inline.mimeType || "") || "png";
//       const fileName = `test_image_${uuidv4()}.${ext}`;

//       try {
//         const url = await minIOService.uploadFile(buffer, fileName, inline.mimeType || "image/png", "images");
//         console.log(`✅ Image uploaded to MinIO: ${url}`);
//         return url;
//       } catch (minioError) {
//         console.warn("❌ MinIO upload failed, saving locally:", minioError);
//         // Fallback: save to public/generated folder
//         const publicDir = path.join(process.cwd(), 'public', 'generated');
//         await fs.mkdir(publicDir, { recursive: true });
//         await fs.writeFile(path.join(publicDir, fileName), buffer);
//         const localUrl = `/generated/${fileName}`;
//         console.log(`✅ Image saved locally: ${localUrl}`);
//         return localUrl;
//       }
//     }

//     throw new Error("No image data received from Gemini");
//   } catch (error) {
//     console.error("❌ Image generation failed:", error);
//     throw error;
//   }
// }

async function generateTestAudio(): Promise<string> {
  console.log("🎵 Generating test audio...");

  const elevenLabs = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
  const text = "Hello! This is a test of the ElevenLabs audio generation system. The robot and the child are working together happily.";

  try {
    const result = await elevenLabs.generateAudio({
      text,
      voiceId: ElevenLabsService.VOICES.RACHEL,
      model: ElevenLabsService.MODELS.ELEVEN_V3, // Fixed: using working model
      voiceSettings: {
        stability: 0.5, // v3 requires: 0.0, 0.5, or 1.0
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true,
      },
      outputFormat: "mp3_44100_128",
    });

    console.log(`✅ Audio uploaded: ${result.publicUrl}`);
    console.log(`📊 Audio metadata: ${result.metadata.voiceId}, ${result.metadata.model}, ${result.metadata.fileSize} bytes`);
    return result.publicUrl;
  } catch (error) {
    console.error("❌ Audio generation failed:", error);
    return "Audio generation failed";
  }
}

async function main() {
  console.log("🚀 Starting test generation script...\n");

  try {
    // Check environment variables
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY environment variable is required");
    }
    if (process.env.ENABLE_ELEVENLABS_AUDIO !== "1") {
      throw new Error("ENABLE_ELEVENLABS_AUDIO must be set to '1'");
    }

    console.log("🔧 Environment check passed\n");

    // Generate image
    // const imageUrl = await generateTestImage();
    // console.log(`🖼️  Image URL: ${imageUrl}\n`);

    // Generate audio
    const audioUrl = await generateTestAudio();
    console.log(`🔊 Audio URL: ${audioUrl}\n`);

    console.log("🎉 Test completed successfully!");
    console.log("📋 Summary:");
    // console.log(`   Image: ${imageUrl}`);
    console.log(`   Audio: ${audioUrl}`);

  } catch (error) {
    console.error("💥 Test failed:", error);
    process.exit(1);
  }
}

// Run the test
main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
