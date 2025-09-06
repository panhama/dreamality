// import { NextRequest } from "next/server";

// // Note: @google/generative-ai supports binary outputs on image models.
// export const runtime = "edge";

// export async function POST(req: NextRequest) {
//   const { scene, appearance } = await req.json() as {
//     scene: { id: string; caption: string; illustration_prompt: string };
//     appearance?: string;
//   };

//   const client = await google.getGenerativeModel({ model: IMAGE_MODEL });

//   const prompt = [
//     `Children's book illustration. Soft, warm palette.`,
//     `Scene caption: ${scene.caption}`,
//     `Style: painterly, cozy, no on-image text.`,
//     appearance ? `Appearance hints: ${appearance}` : ``,
//     `Image requirements: 1536x1024 if possible.`,
//     scene.illustration_prompt
//   ].filter(Boolean).join("\n");

//   const result = await client.generateContent({
//     contents: [{ role: "user", parts: [{ text: prompt }] }],
//   });

//   // find image part (inlineData)
//   const parts = result.response?.candidates?.[0]?.content?.parts ?? [];
//   const inline = parts.find((p: any) => p.inlineData?.data)?.inlineData;
//   if (!inline?.data) {
//     return new Response(JSON.stringify({ error: "No image returned" }), { status: 502 });
//   }

//   const bytes = Buffer.from(inline.data, "base64");
//   return new Response(bytes, {
//     headers: { "Content-Type": inline.mimeType ?? "image/png" },
//   });
// }
