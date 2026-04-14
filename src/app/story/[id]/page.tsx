"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../context/AuthContext";
import type { GeneratedStory } from "../../../types/story";

export default function StoryResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadStory = async () => {
      const storyId = String(params?.id || "");

      if (!storyId) {
        setPageLoading(false);
        return;
      }

      const cached = sessionStorage.getItem(`story_${storyId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as GeneratedStory;
          setStory(parsed);
        } catch {
          // ignore
        }
      }

      try {
        const refDoc = doc(db, "stories", storyId);
        const snap = await getDoc(refDoc);

        if (snap.exists()) {
          const data = snap.data();

          if (data?.generated) {
            setStory(data.generated as GeneratedStory);
            sessionStorage.setItem(
              `story_${storyId}`,
              JSON.stringify(data.generated)
            );
          }
        } else {
          sessionStorage.removeItem(`story_${storyId}`);
        }
      } catch (error) {
        console.error("Story fetch failed:", error);
      } finally {
        setPageLoading(false);
      }
    };

    loadStory();
  }, [params]);

  const mainReferenceCharacter = useMemo(() => {
    if (!story?.characters?.length) return null;
    return story.characters.find((char) => char.imageUrl) || null;
  }, [story]);

  const handleGenerateSceneImage = async (sceneIndex: number) => {
    if (!story) return;

    const storyId = String(params?.id || "");
    if (!storyId) return;

    setImageError("");

    const scene = story.scenes[sceneIndex];
    const prompt = scene.imagePrompt?.trim();

    if (!prompt) {
      setImageError("This scene has no image prompt.");
      return;
    }

    if (!mainReferenceCharacter?.imageUrl) {
      setImageError(
        "Please upload at least one character image first. Scene image generation needs a reference face."
      );
      return;
    }

    try {
      setGeneratingIndex(sceneIndex);

      const response = await fetch("/api/generate-scene-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          faceImageUrl: mainReferenceCharacter.imageUrl,
          characterName: mainReferenceCharacter.name || "main character",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to generate reference-based scene image."
        );
      }

      const updatedScenes = story.scenes.map((item, index) =>
        index === sceneIndex ? { ...item, imageUrl: data.imageUrl } : item
      );

      const updatedStory: GeneratedStory = {
        ...story,
        scenes: updatedScenes,
      };

      setStory(updatedStory);
      sessionStorage.setItem(`story_${storyId}`, JSON.stringify(updatedStory));

      await updateDoc(doc(db, "stories", storyId), {
        generated: updatedStory,
      });
    } catch (error: any) {
      console.error(error);
      setImageError(
        error?.message || "Failed to generate scene image. Please try again."
      );
    } finally {
      setGeneratingIndex(null);
    }
  };

  if (loading || pageLoading) {
    return (
      <main className="page-shell">
        <div className="center-wrap">
          <section className="auth-box">
            <h1 className="auth-title">Loading...</h1>
          </section>
        </div>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="page-shell">
        <div className="center-wrap">
          <section className="auth-box">
            <h1 className="auth-title">Story Not Found</h1>
            <div
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="comic-btn"
                onClick={() => router.push("/create-story")}
              >
                Create New Story
              </button>
              <button
                className="comic-btn secondary"
                onClick={() => router.push("/dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="center-wrap">
        <section
          className="comic-box"
          style={{ maxWidth: "1040px", textAlign: "left" }}
        >
          <div className="comic-badge">{story.genre}</div>
          <h1 className="title-main" style={{ fontSize: "44px" }}>
            {story.title}
          </h1>

          <p className="subtitle" style={{ marginLeft: 0 }}>{story.hook}</p>

          {imageError && (
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
              {imageError}
            </div>
          )}

          <div style={{ marginTop: "28px" }}>
            <h3 style={{ marginBottom: "10px" }}>Full Story</h3>
            <p style={{ lineHeight: 1.9, fontWeight: 700 }}>
              {story.fullStory}
            </p>
          </div>

          <div style={{ marginTop: "28px" }}>
            <h3 style={{ marginBottom: "10px" }}>Characters</h3>
            <div style={{ display: "grid", gap: "12px" }}>
              {story.characters.length === 0 ? (
                <p style={{ fontWeight: 700 }}>No custom characters added.</p>
              ) : (
                story.characters.map((char, index) => (
                  <div
                    key={index}
                    style={{
                      border: "3px solid #000",
                      borderRadius: "16px",
                      padding: "14px",
                      background: "#f7f7f7",
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {char.imageUrl ? (
                      <img
                        src={char.imageUrl}
                        alt={char.name || "Character"}
                        style={{
                          width: "110px",
                          height: "110px",
                          objectFit: "cover",
                          borderRadius: "16px",
                          border: "3px solid #000",
                          background: "#fff",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "110px",
                          height: "110px",
                          borderRadius: "16px",
                          border: "3px solid #000",
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                        }}
                      >
                        No Image
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {char.name || "Unnamed Character"}
                      </div>
                      <div style={{ marginTop: "6px", fontWeight: 700 }}>
                        Role: {char.role || "Not specified"}
                      </div>
                      <div style={{ marginTop: "6px", fontWeight: 700 }}>
                        Traits: {char.traits || "Not specified"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: "28px" }}>
            <h3 style={{ marginBottom: "10px" }}>Comic Scene Cards</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {story.scenes.map((scene, index) => (
                <div
                  key={index}
                  style={{
                    border: "4px solid #000",
                    borderRadius: "20px",
                    padding: "16px",
                    background: index % 2 === 0 ? "#fff" : "#f1f1f1",
                    boxShadow: "8px 8px 0 #000",
                  }}
                >
                  <div
                    style={{
                      display: "inline-block",
                      marginBottom: "10px",
                      padding: "6px 12px",
                      border: "2px solid #000",
                      borderRadius: "999px",
                      fontWeight: 900,
                      background: "#000",
                      color: "#fff",
                    }}
                  >
                    Scene {index + 1}
                  </div>

                  <div style={{ fontWeight: 900, fontSize: "20px" }}>
                    {scene.title}
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      fontWeight: 700,
                      lineHeight: 1.7,
                    }}
                  >
                    {scene.summary}
                  </div>

                  <div style={{ marginTop: "12px", fontWeight: 800 }}>
                    Emotion: {scene.emotion}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      border: "2px dashed #000",
                      borderRadius: "12px",
                      background: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    Dialogue: {scene.dialogue}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      border: "2px solid #000",
                      borderRadius: "12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: "8px" }}>
                      Scene Image Prompt
                    </div>
                    <div style={{ fontWeight: 700 }}>{scene.imagePrompt}</div>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <button
                      className="comic-btn"
                      onClick={() => handleGenerateSceneImage(index)}
                      disabled={generatingIndex === index}
                    >
                      {generatingIndex === index
                        ? "Generating Image..."
                        : "Generate Image"}
                    </button>
                  </div>

                  {scene.imageUrl && (
                    <div
                      style={{
                        marginTop: "16px",
                        position: "relative",
                        borderRadius: "16px",
                        overflow: "hidden",
                        border: "3px solid #000",
                        background: "#fff",
                      }}
                    >
                      <img
                        src={scene.imageUrl}
                        alt={scene.title}
                        style={{
                          width: "100%",
                          display: "block",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "14px",
                          maxWidth: "78%",
                          background: "#fff",
                          border: "3px solid #000",
                          borderRadius: "22px",
                          padding: "12px 14px",
                          fontWeight: 800,
                          lineHeight: 1.35,
                          boxShadow: "4px 4px 0 #000",
                        }}
                      >
                        {scene.dialogue}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "28px" }}>
            <h3 style={{ marginBottom: "10px" }}>Moral</h3>
            <p style={{ fontWeight: 800 }}>{story.moral}</p>
          </div>

          <div
            style={{
              marginTop: "28px",
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <button
              className="comic-btn"
              onClick={() => router.push("/create-story")}
            >
              Create Another Story
            </button>
            <button
              className="comic-btn secondary"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}