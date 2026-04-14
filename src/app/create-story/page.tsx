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
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import type { StoryCharacter, GeneratedStory } from "../../types/story";
import { getMonthKey, normalizeUsageData } from "../../lib/usage";

const genres = [
  "Thriller",
  "Horror",
  "Comedy",
  "Romance",
  "Motivation",
  "Devotional",
  "Kids Story",
];

const languages = ["English", "Telugu", "Hindi", "Tamil", "Kannada"];

type UserProfile = {
  plan?: string;
  storiesUsedThisMonth?: number;
  storyLimitPerMonth?: number;
  usageMonthKey?: string;
};

type CharacterForm = StoryCharacter & {
  file?: File | null;
  previewUrl?: string;
};

const loadingStages = [
  "Crafting your story...",
  "Building characters...",
  "Creating emotional scenes...",
  "Almost ready...",
];

export default function CreateStoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [genre, setGenre] = useState("Thriller");
  const [language, setLanguage] = useState("English");
  const [prompt, setPrompt] = useState("");
  const [characters, setCharacters] = useState<CharacterForm[]>([
    { name: "", role: "", traits: "", imageUrl: "", file: null, previewUrl: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState(loadingStages[0]);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const normalized = normalizeUsageData(userSnap.data() as UserProfile);
          setUserData(normalized);

          const currentMonthKey = getMonthKey();
          if (
            normalized?.usageMonthKey !==
            (userSnap.data() as UserProfile).usageMonthKey
          ) {
            await runTransaction(db, async (transaction) => {
              transaction.update(userRef, {
                usageMonthKey: currentMonthKey,
                storiesUsedThisMonth: 0,
              });
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingPlan(false);
      }
    };

    loadUserData();
  }, [user]);

  useEffect(() => {
    if (!submitting) return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % loadingStages.length;
      setLoadingText(loadingStages[index]);
    }, 1200);

    return () => clearInterval(interval);
  }, [submitting]);

  const updateCharacter = (
    index: number,
    field: keyof CharacterForm,
    value: string
  ) => {
    setCharacters((prev) =>
      prev.map((char, i) =>
        i === index ? { ...char, [field]: value } : char
      )
    );
  };

  const handleFileChange = (index: number, file: File | null) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setCharacters((prev) =>
      prev.map((char, i) =>
        i === index ? { ...char, file, previewUrl } : char
      )
    );
  };

  const addCharacter = () => {
    setCharacters((prev) => [
      ...prev,
      { name: "", role: "", traits: "", imageUrl: "", file: null, previewUrl: "" },
    ]);
  };

  const removeCharacter = (index: number) => {
    setCharacters((prev) => prev.filter((_, i) => i !== index));
  };

  const canGenerate =
    (userData?.storiesUsedThisMonth ?? 0) < (userData?.storyLimitPerMonth ?? 0);

  const cleanedCharacters = useMemo(
    () =>
      characters
        .map((char) => ({
          name: char.name,
          role: char.role,
          traits: char.traits,
          imageUrl: "",
        }))
        .filter(
          (char) => char.name.trim() || char.role.trim() || char.traits.trim()
        ),
    [characters]
  );

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
      setLoadingText(loadingStages[0]);

      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          genre,
          language,
          prompt,
          characters: cleanedCharacters,
        }),
      });

      const data = (await response.json()) as GeneratedStory | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Story generation failed");
      }

      const mergedGenerated: GeneratedStory = {
        ...data,
        characters: cleanedCharacters,
      };

      const payload = {
        userId: user.uid,
        genre,
        language,
        prompt,
        characters: characters.map((char) => ({
          name: char.name,
          role: char.role,
          traits: char.traits,
          imageUrl: "",
        })),
        generated: mergedGenerated,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, "stories"), {
        ...payload,
        createdAtServer: serverTimestamp(),
      });

      const pendingUploads = characters
        .map((char) => ({
          name: char.name,
          role: char.role,
          traits: char.traits,
          previewUrl: char.previewUrl || "",
        }))
        .filter((char) => char.name || char.role || char.traits || char.previewUrl);

      sessionStorage.setItem(`story_${docRef.id}`, JSON.stringify(payload.generated));
      sessionStorage.setItem(
        `story_uploads_${docRef.id}`,
        JSON.stringify(pendingUploads)
      );

      const userRef = doc(db, "users", user.uid);
      const currentMonthKey = getMonthKey();

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userRef);
        if (!snap.exists()) throw new Error("User profile not found.");

        const raw = snap.data() as UserProfile;
        const savedMonthKey = raw.usageMonthKey || currentMonthKey;
        const used = savedMonthKey === currentMonthKey ? raw.storiesUsedThisMonth || 0 : 0;
        const limit = raw.storyLimitPerMonth || 1;

        if (used >= limit) {
          throw new Error("Monthly story limit reached.");
        }

        transaction.update(userRef, {
          usageMonthKey: currentMonthKey,
          storiesUsedThisMonth: used + 1,
        });
      });

      router.push(`/story/${docRef.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || checkingPlan) return null;

  return (
    <main className="page-shell">
      <div className="center-wrap">
        <section className="comic-box" style={{ maxWidth: "900px", textAlign: "left", position: "relative" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "start",
            }}
          >
            <div>
              <div className="comic-badge">Create Story</div>
              <h1 className="title-main" style={{ fontSize: "44px" }}>
                VihaStory AI
              </h1>
              <p className="subtitle" style={{ marginLeft: 0 }}>
                Generate story first. Character image enhancement comes next.
              </p>
            </div>

            <div
              style={{
                border: "3px solid #000",
                borderRadius: "16px",
                padding: "14px",
                background: "#f7f7f7",
                minWidth: "220px",
              }}
            >
              <div style={{ fontWeight: 900 }}>Plan</div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>
                {userData?.plan || "Free"}
              </div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>
                Usage: {userData?.storiesUsedThisMonth ?? 0} /{" "}
                {userData?.storyLimitPerMonth ?? 0}
              </div>
            </div>
          </div>

          {!canGenerate && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                borderRadius: "14px",
                border: "3px solid #000",
                background: "#fff2f2",
                color: "#8b0000",
                fontWeight: 800,
              }}
            >
              Your monthly story limit is reached. Upgrade your plan before generating another story.
            </div>
          )}

          <form onSubmit={handleGenerate} style={{ marginTop: "28px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "18px",
              }}
            >
              <div className="form-group">
                <label className="form-label">Genre</label>
                <select
                  className="form-input"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                >
                  {genres.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
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

            <div className="form-group">
              <label className="form-label">Story Idea</label>
              <textarea
                className="form-input"
                placeholder="Example: I want a Telugu kids story where a brave child and a talking rabbit save their village."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={{ minHeight: "130px", resize: "vertical" }}
              />
            </div>

            <div style={{ marginTop: "28px", marginBottom: "12px", fontWeight: 800 }}>
              Characters
            </div>

            {characters.map((char, index) => (
              <div
                key={index}
                style={{
                  border: "3px solid #000",
                  borderRadius: "18px",
                  padding: "16px",
                  marginBottom: "16px",
                  background: "#f5f5f5",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <input
                    className="form-input"
                    placeholder="Character Name"
                    value={char.name}
                    onChange={(e) => updateCharacter(index, "name", e.target.value)}
                  />
                  <input
                    className="form-input"
                    placeholder="Role"
                    value={char.role}
                    onChange={(e) => updateCharacter(index, "role", e.target.value)}
                  />
                  <input
                    className="form-input"
                    placeholder="Traits"
                    value={char.traits}
                    onChange={(e) => updateCharacter(index, "traits", e.target.value)}
                  />
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label className="form-label">Character Image (Optional for later enhancement)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    onChange={(e) =>
                      handleFileChange(index, e.target.files?.[0] || null)
                    }
                  />
                </div>

                {char.previewUrl && (
                  <div style={{ marginTop: "14px" }}>
                    <img
                      src={char.previewUrl}
                      alt={char.name || `Character ${index + 1}`}
                      style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "16px",
                        border: "3px solid #000",
                      }}
                    />
                  </div>
                )}

                {characters.length > 1 && (
                  <button
                    type="button"
                    className="comic-btn secondary"
                    onClick={() => removeCharacter(index)}
                    style={{ marginTop: "12px" }}
                  >
                    Remove Character
                  </button>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <button type="button" className="comic-btn secondary" onClick={addCharacter}>
                Add Character
              </button>

              <button
                type="submit"
                className="comic-btn"
                disabled={submitting || !canGenerate}
                style={{ opacity: submitting || !canGenerate ? 0.7 : 1 }}
              >
                {submitting ? "Generating..." : "Generate Story"}
              </button>
            </div>

            {error && (
              <p style={{ color: "red", marginTop: "16px", fontWeight: 700 }}>
                {error}
              </p>
            )}
          </form>

          {submitting && (
            <div
              style={{
                marginTop: "20px",
                border: "3px solid #000",
                borderRadius: "18px",
                padding: "16px",
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: "18px" }}>{loadingText}</div>
              <div
                style={{
                  marginTop: "12px",
                  height: "12px",
                  background: "#ddd",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "70%",
                    height: "100%",
                    background: "#000",
                    borderRadius: "999px",
                    animation: "pulseWidth 1.4s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}