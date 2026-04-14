import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  GeneratedStory,
  StoryCharacter,
} from "../../../types/story";

type RequestBody = {
  genre: string;
  language: string;
  prompt: string;
  characters: StoryCharacter[];
};

const ai = new GoogleGenAI({});

function cleanCharacters(characters: StoryCharacter[]) {
  return characters.filter(
    (char) => char.name.trim() || char.role.trim() || char.traits.trim()
  );
}

function extractJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Model did not return valid JSON.");
}

function normalizeStory(data: any): GeneratedStory {
  return {
    title: String(data.title || "Untitled Story"),
    genre: String(data.genre || "Story"),
    language: String(data.language || "English"),
    hook: String(data.hook || ""),
    fullStory: String(data.fullStory || ""),
    moral: String(data.moral || ""),
    characters: Array.isArray(data.characters)
      ? data.characters.map((char: any) => ({
          name: String(char.name || ""),
          role: String(char.role || ""),
          traits: String(char.traits || ""),
        }))
      : [],
    scenes: Array.isArray(data.scenes)
      ? data.scenes.map((scene: any) => ({
          title: String(scene.title || ""),
          summary: String(scene.summary || ""),
          emotion: String(scene.emotion || ""),
          dialogue: String(scene.dialogue || ""),
          imagePrompt: String(scene.imagePrompt || ""),
        }))
      : [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    const genre = body.genre?.trim() || "Thriller";
    const language = body.language?.trim() || "English";
    const prompt = body.prompt?.trim() || "";
    const characters = cleanCharacters(body.characters || []);

    if (!prompt) {
      return NextResponse.json(
        { error: "Story idea is required." },
        { status: 400 }
      );
    }

    const characterBlock =
      characters.length > 0
        ? characters
            .map(
              (char, index) =>
                `${index + 1}. Name: ${char.name || "Unknown"}, Role: ${
                  char.role || "Not specified"
                }, Traits: ${char.traits || "Not specified"}`
            )
            .join("\n")
        : "No custom characters provided. Create suitable characters automatically.";

    const systemPrompt = `
You are an expert family-friendly cinematic story writer.

Your job:
- Write a rich, complete, emotionally engaging story.
- Follow the user's selected genre exactly.
- Follow the user's selected language exactly.
- Use the user's characters naturally.
- If the user asks for a kids story, write in a soft, warm, simple, child-friendly tone.
- Avoid nudity, explicit sexual content, or graphic unsafe content.
- Keep story output safe for a broad audience.
- Make the story feel cinematic and visual.

Return ONLY valid JSON.
Do not use markdown fences.
Do not add explanations outside JSON.

Return this exact JSON format:
{
  "title": "string",
  "genre": "string",
  "language": "string",
  "hook": "string",
  "fullStory": "string",
  "moral": "string",
  "characters": [
    {
      "name": "string",
      "role": "string",
      "traits": "string"
    }
  ],
  "scenes": [
    {
      "title": "string",
      "summary": "string",
      "emotion": "string",
      "dialogue": "string",
      "imagePrompt": "string"
    }
  ]
}

Rules:
- fullStory must be a complete detailed story, not a short summary.
- fullStory should be immersive and clearly different based on prompt.
- scenes should be 5 to 7.
- each scene summary must match the actual story.
- each scene dialogue must be short and emotional.
- each imagePrompt must describe a cinematic comic-book illustration scene.
- keep the output fully in the selected language.
`;

    const userPrompt = `
Selected genre: ${genre}
Selected language: ${language}

Story request:
${prompt}

Characters:
${characterBlock}

Generate a complete story in ${language}.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userPrompt}`,
    });

    const rawText = response.text || "";
    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText);
    const story = normalizeStory(parsed);

    return NextResponse.json(story);
  } catch (error: any) {
    console.error("Gemini story generation error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to generate story with Gemini.",
      },
      { status: 500 }
    );
  }
}