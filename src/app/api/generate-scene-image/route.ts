import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const token = process.env.REPLICATE_API_TOKEN;

if (!token) {
  throw new Error("REPLICATE_API_TOKEN is missing in .env.local");
}

const replicate = new Replicate({
  auth: token,
});

function buildStyledPrompt(scenePrompt: string, characterName?: string) {
  return [
    "warm emotional vertical comic-book illustration",
    "viral instagram pocket-stories style",
    "clean cartoon rendering",
    "soft cinematic lighting",
    "cute expressive character design",
    "storybook panel composition",
    "high detail",
    "family safe",
    "no watermark",
    "no extra limbs",
    characterName ? `main character resembles ${characterName}` : "",
    scenePrompt,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const prompt = String(body.prompt || "").trim();
    const faceImageUrl = String(body.faceImageUrl || "").trim();
    const characterName = String(body.characterName || "").trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "Image prompt is required." },
        { status: 400 }
      );
    }

    if (!faceImageUrl) {
      return NextResponse.json(
        { error: "Reference face image is required." },
        { status: 400 }
      );
    }

    const finalPrompt = buildStyledPrompt(prompt, characterName);

    const output = await replicate.run(
      "bytedance/flux-pulid:8baa7ef2255075b46f4d91cd238c21d31181b3e6a864463f967960bb0112525b",
      {
        input: {
          main_face_image: faceImageUrl,
          prompt: finalPrompt,
          negative_prompt:
            "bad quality, worst quality, text, signature, watermark, extra limbs, blurry, distorted face, duplicate person, cropped face",
          width: 768,
          height: 1024,
          num_steps: 18,
          guidance_scale: 4,
          id_weight: 1.2,
          start_step: 0,
          output_format: "jpg",
          output_quality: 90,
          num_outputs: 1,
        },
      }
    );

    const imageUrl = Array.isArray(output) ? String(output[0] || "") : "";

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL returned from model." },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Replicate scene image generation error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to generate reference-based scene image.",
      },
      { status: 500 }
    );
  }
}