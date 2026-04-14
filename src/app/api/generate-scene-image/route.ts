import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StoryCharacter = {
  name?: string;
  role?: string;
  traits?: string;
  imageUrl?: string;
};

type GenerateSceneImageBody = {
  prompt?: string;
  title?: string;
  genre?: string;
  language?: string;
  characters?: StoryCharacter[];
  referenceImages?: string[];
};

function buildStyledPrompt(params: {
  prompt: string;
  title: string;
  genre: string;
  language: string;
  characters: StoryCharacter[];
}) {
  const { prompt, title, genre, language, characters } = params;

  const characterLine = characters.length
    ? characters
        .map((char) => {
          const parts = [
            char.name?.trim(),
            char.role?.trim(),
            char.traits?.trim(),
          ].filter(Boolean);

          return parts.join(", ");
        })
        .filter(Boolean)
        .join(" | ")
    : "No named characters";

  return [
    "Create a polished vertical comic-book illustration.",
    "Warm cinematic lighting, cute expressive characters, emotional storytelling frame.",
    "Clean cartoon style, storybook finish, mobile-friendly composition.",
    "High quality, family safe, no watermark, no text artifacts, no blurry faces.",
    "If dialogue is implied, leave visual space for a speech bubble.",
    Scene title: ${title}.,
    Genre: ${genre}.,
    Language context: ${language}.,
    Characters: ${characterLine}.,
    Scene description: ${prompt}.,
  ].join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateSceneImageBody;

    const prompt = body.prompt?.trim() || "";
    const title = body.title?.trim() || "Scene";
    const genre = body.genre?.trim() || "Comic";
    const language = body.language?.trim() || "English";
    const characters = Array.isArray(body.characters) ? body.characters : [];

    if (!prompt) {
      return NextResponse.json(
        { error: "Scene prompt is required." },
        { status: 400 }
      );
    }

    const hfApiKey = process.env.HF_API_KEY;
    if (!hfApiKey) {
      return NextResponse.json(
        {
          error:
            "Missing HF_API_KEY. Add it in .env.local and Firebase App Hosting environment variables.",
        },
        { status: 500 }
      );
    }

    const finalPrompt = buildStyledPrompt({
      prompt,
      title,
      genre,
      language,
      characters,
    });

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: Bearer ${hfApiKey},
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: finalPrompt,
          parameters: {
            width: 768,
            height: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = "Image generation failed.";
      try {
        const errorData = await response.json();
        errorMessage =
          errorData?.error ||
          errorData?.message ||
          Image generation failed with status ${response.status};
      } catch {
        errorMessage = Image generation failed with status ${response.status};
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = data:${contentType};base64,${base64};

    return NextResponse.json({ imageUrl: dataUrl });
  } catch (error: any) {
    console.error("Hugging Face scene image generation error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to generate scene image.",
      },
      { status: 500 }
    );
  }
}