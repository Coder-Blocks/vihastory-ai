"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";

type StoryCharacter = {
  name: string;
  role: string;
  traits: string;
  file: File | null;
  previewUrl: string;
  imageUrl?: string;
};

type GeneratedScene = {
  title: string;
  summary: string;
  emotion: string;
  dialogue: string;
  imagePrompt: string;
};

type GeneratedStory = {
  title: string;
  subtitle?: string;
  fullStory: string;
  moral?: string;
  scenes: GeneratedScene[];
  genre: string;
  language: string;
  characters?: Array<{
    name: string;
    role: string;
    traits: string;
    imageUrl?: string;
  }>;
};

type UsageData = {
  plan?: string;
  storiesUsedThisMonth?: number;
  storyLimitPerMonth?: number;
  usageMonthKey?: string;
};

const GENRES = [
  "Romance",
  "Comedy",
  "Thriller",
  "Horror",
  "Fantasy",
  "Kids Story",
  "Adventure",
  "Devotional",
  "Drama",
  "Sci-Fi",
];

const languages = ["English", "Telugu", "Hindi", "Tamil", "Kannada"];

const getMonthKey = () => {
  const now = new Date();
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const createEmptyCharacter = (): StoryCharacter => ({
  name: "",
  role: "",
  traits: "",
  file: null,
  previewUrl: "",
  imageUrl: "",
});

export default function CreateStoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [genre, setGenre] = useState("Romance");
  const [language, setLanguage] = useState("Telugu");
  const [prompt, setPrompt] = useState("");
  const [characters, setCharacters] = useState<StoryCharacter[]>([
    createEmptyCharacter(),
  ]);

  const [checkingPlan, setCheckingPlan] = useState(true);
  const [canGenerate, setCanGenerate] = useState(true);
  const [planName, setPlanName] = useState("Free");
  const [usageText, setUsageText] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState("Crafting your story...");
  const [progress, setProgress] = useState(10);

  const hasAnyCharacterImage = useMemo(
    () => characters.some((c) => !!c.file),
    [characters]
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const checkPlan = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        const monthKey = getMonthKey();

        if (!snap.exists()) {
          setPlanName("Free");
          setUsageText("0 / 1");
          setCanGenerate(true);
          setCheckingPlan(false);
          return;
        }

        const data = snap.data() as UsageData;
        let storiesUsedThisMonth = data.storiesUsedThisMonth ?? 0;
        let storyLimitPerMonth = data.storyLimitPerMonth ?? 1;
        const usageMonthKey = data.usageMonthKey ?? monthKey;
        const plan = data.plan ?? "Free";

        if (usageMonthKey !== monthKey) {
          storiesUsedThisMonth = 0;
        }

        const unlimited = storyLimitPerMonth >= 999999;
        const allowed = unlimited || storiesUsedThisMonth < storyLimitPerMonth;

        setPlanName(plan);
        setUsageText(
          unlimited
            ? `${storiesUsedThisMonth} / Unlimited`
            : `${storiesUsedThisMonth} / ${storyLimitPerMonth}`
        );
        setCanGenerate(allowed);
      } catch (err) {
        console.error("Plan check failed:", err);
        setCanGenerate(true);
      } finally {
        setCheckingPlan(false);
      }
    };

    checkPlan();
  }, [user]);

  useEffect(() => {
    if (!submitting) return;

    const steps = [
      { text: "Crafting your story...", value: 20 },
      { text: "Building scenes and dialogue...", value: 45 },
      { text: "Preparing character references...", value: 65 },
      { text: "Saving your story...", value: 85 },
      { text: "Finalizing output...", value: 95 },
    ];

    let index = 0;
    const interval = window.setInterval(() => {
      if (index < steps.length) {
        setLoadingText(steps[index].text);
        setProgress(steps[index].value);
        index += 1;
      }
    }, 1200);

    return () => window.clearInterval(interval);
  }, [submitting]);

  useEffect(() => {
    return () => {
      characters.forEach((char) => {
        if (char.previewUrl) {
          URL.revokeObjectURL(char.previewUrl);
        }
      });
    };
  }, [characters]);

  const updateCharacter = (
    index: number,
    field: keyof StoryCharacter,
    value: string | File | null
  ) => {
    setCharacters((prev) =>
      prev.map((char, i) => {
        if (i !== index) return char;

        if (field === "file") {
          if (char.previewUrl) {
            URL.revokeObjectURL(char.previewUrl);
          }

          const file = value as File | null;

          return {
            ...char,
            file,
            previewUrl: file ? URL.createObjectURL(file) : "",
          };
        }

        return {
          ...char,
          [field]: value,
        };
      })
    );
  };

  const addCharacter = () => {
    setCharacters((prev) => [...prev, createEmptyCharacter()]);
  };

  const removeCharacter = (index: number) => {
    setCharacters((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      const updated = prev.filter((_, i) => i !== index);
      return updated.length ? updated : [createEmptyCharacter()];
    });
  };

  const uploadCharacterImages = async (): Promise<StoryCharacter[]> => {
    if (!user) throw new Error("Please sign in again.");

    const uploaded = await Promise.all(
      characters.map(async (char, index) => {
        const baseCharacter: StoryCharacter = {
          name: char.name.trim(),
          role: char.role.trim(),
          traits: char.traits.trim(),
          file: null,
          previewUrl: char.previewUrl,
          imageUrl: char.imageUrl || "",
        };

        if (!char.file) {
          return baseCharacter;
        }

        const safeName = (char.name || `character-${index + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, "-");

        const fileExt = char.file.name.split(".").pop()?.toLowerCase() || "jpg";

        const storageRef = ref(
          storage,
          `users/${user.uid}/characters/${Date.now()}-${safeName}.${fileExt}`
        );

        await uploadBytes(storageRef, char.file);
        const imageUrl = await getDownloadURL(storageRef);

        return {
          ...baseCharacter,
          imageUrl,
        };
      })
    );

    return uploaded;
  };

  const increaseUsage = async () => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const monthKey = getMonthKey();

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);

      if (!snap.exists()) {
        transaction.set(userRef, {
          uid: user.uid,
          email: user.email || "",
          fullName: user.displayName || "",
          plan: "Free",
          storiesUsedThisMonth: 1,
          storyLimitPerMonth: 1,
          usageMonthKey: monthKey,
          createdAt: serverTimestamp(),
        });
        return;
      }

      const data = snap.data() as UsageData;
      const currentMonthKey = data.usageMonthKey ?? monthKey;
      const currentUsed =
        currentMonthKey === monthKey ? data.storiesUsedThisMonth ?? 0 : 0;

      transaction.update(userRef, {
        storiesUsedThisMonth: currentUsed + 1,
        usageMonthKey: monthKey,
      });
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!prompt.trim()) {
      setError("Please enter your story idea.");
      return;
    }

    if (!user) {
      setError("Please sign in again.");
      return;
    }

    if (!canGenerate) {
      setError("Your monthly story limit is reached. Please upgrade your plan.");
      return;
    }

    try {
      setSubmitting(true);
      setProgress(15);
      setLoadingText("Preparing your characters...");

      const uploadedCharacters = await uploadCharacterImages();

      const cleanedCharacters = uploadedCharacters.filter(
        (char) =>
          char.name.trim() ||
          char.role.trim() ||
          char.traits.trim() ||
          char.imageUrl
      );

      setProgress(35);
      setLoadingText("Generating full story...");

      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          genre,
          language,
          prompt,
          characters: cleanedCharacters.map((char) => ({
            name: char.name,
            role: char.role,
            traits: char.traits,
            imageUrl: char.imageUrl || "",
          })),
        }),
      });

      const data = (await response.json()) as GeneratedStory | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Story generation failed."
        );
      }

      setProgress(80);
      setLoadingText("Saving your story...");

      const payload = {
        userId: user.uid,
        genre,
        language,
        prompt,
        title: data.title,
        subtitle: data.subtitle || "",
        fullStory: data.fullStory,
        moral: data.moral || "",
        scenes: data.scenes || [],
        characters: cleanedCharacters.map((char) => ({
          name: char.name,
          role: char.role,
          traits: char.traits,
          imageUrl: char.imageUrl || "",
        })),
        hasReferenceImage: cleanedCharacters.some((char) => !!char.imageUrl),
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, "stories"), {
        ...payload,
        createdAtServer: serverTimestamp(),
      });

      await increaseUsage();

      sessionStorage.setItem(`story_${docRef.id}`, JSON.stringify(payload));

      setProgress(100);
      setLoadingText("Opening your story...");

      router.push(`/story/${docRef.id}`);
    } catch (err: any) {
      console.error("Story generation failed:", err);
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || checkingPlan) {
    return null;
  }

  return (
    <main className="page-shell">
      <div className="center-wrap">
        <section className="comic-box" style={{ maxWidth: "900px" }}>
          <div className="comic-badge">Create Story</div>

          <h1 className="title-main" style={{ fontSize: "52px" }}>
            VihaStory AI
          </h1>

          <p className="subtitle">
            Create a comic-style story with scenes, dialogue, and character-driven moments.
          </p>

          <div
            style={{
              marginTop: "18px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <div className="mini-stat-box">
              <div className="mini-stat-title">Current Plan</div>
              <div className="mini-stat-value">{planName}</div>
            </div>
            <div className="mini-stat-box">
              <div className="mini-stat-title">Monthly Usage</div>
              <div className="mini-stat-value">{usageText}</div>
            </div>
            <div className="mini-stat-box">
              <div className="mini-stat-title">Reference Images</div>
              <div className="mini-stat-value">
                {hasAnyCharacterImage ? "Added" : "Optional"}
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerate}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "18px",
                marginBottom: "20px",
              }}
            >
              <div>
                <label className="form-label">Genre</label>
                <select
                  className="form-input"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  {GENRES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Language</label>
                <select
                  className="form-input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {languages.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "28px" }}>
              <label className="form-label">Story Idea</label>
              <textarea
                className="form-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Ravi loves Vinita. Murthy is a motivation speaker. Harish is Vinita's brother and starts as a villain. I want a romantic, comedy, drama story with a happy ending."
                rows={6}
                style={{ resize: "vertical", minHeight: "180px" }}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <h2 style={{ fontSize: "34px", fontWeight: 900, marginBottom: "16px" }}>
                Characters
              </h2>

              {characters.map((char, index) => (
                <div
                  key={index}
                  style={{
                    border: "4px solid #000",
                    borderRadius: "30px",
                    padding: "22px",
                    marginBottom: "22px",
                    background: "#efefef",
                    boxShadow: "10px 10px 0 #000",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "14px",
                    }}
                  >
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Character Name"
                      value={char.name}
                      onChange={(e) =>
                        updateCharacter(index, "name", e.target.value)
                      }
                    />

                    <input
                      className="form-input"
                      type="text"
                      placeholder="Role"
                      value={char.role}
                      onChange={(e) =>
                        updateCharacter(index, "role", e.target.value)
                      }
                    />

                    <input
                      className="form-input"
                      type="text"
                      placeholder="Traits"
                      value={char.traits}
                      onChange={(e) =>
                        updateCharacter(index, "traits", e.target.value)
                      }
                    />
                  </div>

                  <div style={{ marginTop: "18px" }}>
                    <label className="form-label">
                      Character Image (Optional for later enhancement)
                    </label>

                    <input
                      className="form-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        updateCharacter(index, "file", file);
                      }}
                    />
                  </div>

                  {char.previewUrl && (
                    <div style={{ marginTop: "16px" }}>
                      <img
                        src={char.previewUrl}
                        alt={char.name || `Character ${index + 1}`}
                        style={{
                          width: "160px",
                          height: "160px",
                          objectFit: "cover",
                          borderRadius: "24px",
                          border: "4px solid #000",
                          display: "block",
                        }}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="comic-btn secondary"
                    style={{ marginTop: "18px", width: "100%" }}
                    onClick={() => removeCharacter(index)}
                  >
                    Remove Character
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="comic-btn secondary"
                style={{ width: "100%", marginBottom: "18px" }}
                onClick={addCharacter}
              >
                Add Character
              </button>
            </div>

            {error && (
              <div
                style={{
                  border: "3px solid #000",
                  borderRadius: "22px",
                  padding: "16px",
                  background: "#ffe8e8",
                  color: "#9f1111",
                  fontWeight: 800,
                  marginBottom: "20px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="comic-btn"
              style={{ width: "100%", marginBottom: "18px" }}
              disabled={submitting || !canGenerate}
            >
              {submitting ? "Generating..." : "Generate Story"}
            </button>

            {submitting && (
              <div
                style={{
                  marginTop: "10px",
                  border: "4px solid #000",
                  borderRadius: "28px",
                  padding: "18px",
                  background: "#f5f5f5",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: "18px",
                    marginBottom: "14px",
                  }}
                >
                  {loadingText}
                </div>

                <div
                  style={{
                    height: "16px",
                    background: "#d8d8d8",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "#000",
                      borderRadius: "999px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}