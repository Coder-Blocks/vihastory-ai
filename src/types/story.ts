export type StoryCharacter = {
  name: string;
  role: string;
  traits: string;
  imageUrl?: string;
};

export type StoryScene = {
  title: string;
  summary: string;
  emotion: string;
  dialogue: string;
  imagePrompt: string;
  imageUrl?: string;
};

export type GeneratedStory = {
  title: string;
  genre: string;
  language: string;
  hook: string;
  fullStory: string;
  moral: string;
  characters: StoryCharacter[];
  scenes: StoryScene[];
};

export type StoryListItem = {
  id: string;
  userId?: string | null;
  genre?: string;
  language?: string;
  prompt?: string;
  createdAt?: any;
  createdAtServer?: any;
  generated?: GeneratedStory;
  characters?: StoryCharacter[];
};