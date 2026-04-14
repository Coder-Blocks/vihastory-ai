"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

type StoryCharacter = {
  name: string;
  role: string;
  traits: string;
  imageUrl?: string;
};

type StoryScene = {
  title: string;
  summary: string;
  emotion: string;
  dialogue: string;
  imagePrompt: string;
};

type StoryDocument = {
  userId?: string;
  genre: string;
  language: string;
  prompt: string;
  title: string;
  subtitle?: string;
  fullStory: string;
  moral?: string;
  scenes: StoryScene[];
  characters?: StoryCharacter[];
  hasReferenceImage?: boolean;
  sceneImages?: Record<string, string>;
};

type SceneImageResponse = {
  imageUrl?: string;
  error?: string;
};

export default function StoryResultPage() {
  const params = useParams();
  const router = useRouter();

  const storyId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [story, setStory] = useState<StoryDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [sceneImages, setSceneImages] = useState<Record<string, string>>({});
  const [generatingSceneIndex, setGeneratingSceneIndex] = useState<number | null>(null);
  const [sceneError, setSceneError] = useState("");
  const [sceneSuccess, setSceneSuccess] = useState("");

  useEffect(() => {
    const loadStory = async () => {
      if (!storyId) {
        setPageError("Invalid story ID.");
        setLoading(false);
        return;
      }

      try {
        const sessionKey = story_${storyId};
        const sessionStory = sessionStorage.getItem(sessionKey);

        if (sessionStory) {
          const parsed = JSON.parse(sessionStory) as StoryDocument;
          setStory(parsed);
          setSceneImages(parsed.sceneImages || {});
          setLoading(false);
          return;
        }

        const storyRef = doc(db, "stories", storyId);
        const snap = await getDoc(storyRef);

        if (!snap.exists()) {
          setPageError("Story not found.");
          setLoading(false);
          return;
        }

        const data = snap.data() as StoryDocument;
        setStory(data);
        setSceneImages(data.sceneImages || {});
      } catch (error) {
        console.error("Failed to load story:", error);
        setPageError("Failed to load story.");
      } finally {
        setLoading(false);
      }
    };

    loadStory();
  }, [storyId]);

  const referenceImages = useMemo(() => {
    if (!story?.characters?.length) return [];
    return story.characters
      .map((char) => char.imageUrl?.trim())
      .filter((url): url is string => !!url);
  }, [story]);

  const handleGenerateSceneImage = async (scene: StoryScene, index: number) => {
    if (!storyId || !story) return;

    setSceneError("");
    setSceneSuccess("");

    try {
      setGeneratingSceneIndex(index);

      const response = await fetch("/api/generate-scene-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: scene.imagePrompt,
          title: scene.title,
          genre: story.genre,
          language: story.language,
          characters: story.characters || [],
          referenceImages,
        }),
      });

      const data = (await response.json()) as SceneImageResponse;

      if (!response.ok || data.error || !data.imageUrl) {
        throw new Error(data.error || "Scene image generation failed.");
      }

      const updatedSceneImages = {
        ...sceneImages,
        [String(index)]: data.imageUrl,
      };

      setSceneImages(updatedSceneImages);
      setSceneSuccess(Scene ${index + 1} image generated successfully.);

      const storyRef = doc(db, "stories", storyId);
      await updateDoc(storyRef, {
        sceneImages: updatedSceneImages,
      });

      const updatedStory: StoryDocument = {
        ...story,
        sceneImages: updatedSceneImages,
      };

      setStory(updatedStory);
      sessionStorage.setItem(story_${storyId}, JSON.stringify(updatedStory));
    } catch (error: any) {
      console.error("Scene image generation failed:", error);
      setSceneError(error?.message || "Failed to generate scene image.");
    } finally {
      setGeneratingSceneIndex(null);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <div className="center-wrap">
          <section className="comic-box" style={{ maxWidth: "980px" }}>
            <div className="comic-badge">Loading</div>
            <h1 className="title-main" style={{ fontSize: "52px" }}>
              VihaStory AI
            </h1>
            <p className="subtitle">Loading your saved story...</p>
          </section>
        </div>
      </main>
    );
  }

  if (pageError || !story) {
    return (
      <main className="page-shell">
        <div className="center-wrap">
          <section className="comic-box" style={{ maxWidth: "760px" }}>
            <div className="comic-badge">Error</div>
            <h1 className="title-main" style={{ fontSize: "48px" }}>
              Story Not Found
            </h1>
            <p className="subtitle">{pageError || "Unable to open this story."}</p>

            <div style={{ marginTop: "22px", display: "grid", gap: "14px" }}>
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

  return (
    <main className="page-shell">
      <div className="center-wrap">
        <section className="comic-box" style={{ maxWidth: "1080px" }}>
          <div className="comic-badge">{story.genre}</div>

          <h1 className="title-main" style={{ fontSize: "56px", marginBottom: "8px" }}>
            {story.title}
          </h1>

          {story.subtitle && (
            <p
              style={{
                fontSize: "24px",
                fontWeight: 700,
                lineHeight: 1.5,
                marginBottom: "26px",
              }}
            >
              {story.subtitle}
            </p>
          )}

          {sceneError && (
            <div
              style={{
                border: "3px solid #000",
                borderRadius: "22px",
                padding: "18px",
                background: "#ffe8e8",
                color: "#9f1111",
                fontWeight: 800,
                marginBottom: "22px",
              }}
            >
              {sceneError}
            </div>
          )}

          {sceneSuccess && (
            <div
              style={{
                border: "3px solid #000",
                borderRadius: "22px",
                padding: "18px",
                background: "#eafaea",
                color: "#086108",
                fontWeight: 800,
                marginBottom: "22px",
              }}
            >
              {sceneSuccess}
            </div>
          )}

          <div
            style={{
              marginBottom: "28px",
              border: "4px solid #000",
              borderRadius: "28px",
              padding: "22px",
              background: "#f8f8f8",
            }}
          >
            <h2 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "10px" }}>
              Full Story
            </h2>
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "22px",
                lineHeight: 1.9,
                fontWeight: 700,
              }}
            >
              {story.fullStory}
            </div>
          </div>

          {!!story.characters?.length && (
            <div
              style={{
                marginBottom: "30px",
                border: "4px solid #000",
                borderRadius: "28px",
                padding: "22px",
                background: "#f8f8f8",
              }}
            >
              <h2 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "18px" }}>
                Characters
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "18px",
                }}
              >
                {story.characters.map((char, index) => (
                  <div
                    key={${char.name}-${index}}
                    style={{
                      border: "3px solid #000",
                      borderRadius: "24px",
                      padding: "18px",
                      background: "#fff",
                    }}
                  >
                    {char.imageUrl ? (
                      <img
                        src={char.imageUrl}
                        alt={char.name || Character ${index + 1}}
                        style={{
                          width: "100%",
                          height: "240px",
                          objectFit: "cover",
                          borderRadius: "18px",
                          border: "3px solid #000",
                          marginBottom: "14px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "240px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "18px",
                          border: "3px solid #000",
                          marginBottom: "14px",
                          fontWeight: 900,
                          fontSize: "24px",
                          background: "#efefef",
                        }}
                      >
                        No Image
                      </div>
                    )}

                    <div style={{ fontSize: "24px", fontWeight: 900, marginBottom: "8px" }}>
                      {char.name || Character ${index + 1}}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                      Role: {char.role || "-"}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>
                      Traits: {char.traits || "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!story.scenes?.length && (
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ fontSize: "34px", fontWeight: 900, marginBottom: "18px" }}>
                Comic Scene Cards
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "22px",
                }}
              >
                {story.scenes.map((scene, index) => (
                  <div
                    key={${scene.title}-${index}}
                    style={{
                      border: "4px solid #000",
                      borderRadius: "28px",
                      padding: "20px",
                      background: "#fff",
                      boxShadow: "10px 10px 0 #000",
                    }}
                  >
                    <div className="comic-badge" style={{ marginBottom: "14px" }}>
                      Scene {index + 1}
                    </div>

                    <h3
                      style={{
                        fontSize: "24px",
                        fontWeight: 900,
                        marginBottom: "12px",
                        lineHeight: 1.3,
                      }}
                    >
                      {scene.title}
                    </h3>

                    <p
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        lineHeight: 1.7,
                        marginBottom: "14px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {scene.summary}
                    </p>

                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 900,
                        marginBottom: "14px",
                      }}
                    >
                      Emotion: {scene.emotion}
                    </div>

                    <div
                      style={{
                        border: "3px dashed #000",
                        borderRadius: "20px",
                        padding: "16px",
                        marginBottom: "16px",
                        background: "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 900,
                          marginBottom: "8px",
                        }}
                      >
                        Dialogue
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {scene.dialogue}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "3px solid #000",
                        borderRadius: "20px",
                        padding: "16px",
                        marginBottom: "16px",
                        background: "#f8f8f8",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 900,
                          marginBottom: "8px",
                        }}
                      >
                        Scene Image Prompt
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {scene.imagePrompt}
                      </div>
                    </div>

                    {sceneImages[String(index)] && (
                      <div
                        style={{
                          marginBottom: "16px",
                          position: "relative",
                          borderRadius: "22px",
                          overflow: "hidden",
                          border: "4px solid #000",
                          background: "#fff",
                        }}
                      >
                        <img
                          src={sceneImages[String(index)]}
                          alt={Scene ${index + 1}}
                          style={{
                            width: "100%",
                            display: "block",
                          }}
                        />

                        {/* Cartoon speech bubble overlay */}
                        {scene.dialogue && (
                          <>
                            <div
                              style={{
                                position: "absolute",
                                top: "16px",
                                left: "16px",
                                maxWidth: "78%",
                                background: "#fff",
                                border: "4px solid #000",
                                borderRadius: "28px",
                                padding: "14px 16px",
                                boxShadow: "6px 6px 0 #000",
                                zIndex: 2,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "16px",
                                  fontWeight: 900,
                                  lineHeight: 1.5,
                                  color: "#000",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {scene.dialogue}
                              </div>
                            </div>

                            {/* Bubble tail */}
                            <div
                              style={{
                                position: "absolute",
                                top: "96px",
                                left: "52px",
                                width: "26px",
                                height: "26px",
                                background: "#fff",
                                borderLeft: "4px solid #000",
                                borderBottom: "4px solid #000",
                                transform: "rotate(-35deg)",
                                zIndex: 1,
                              }}
                            />
                          </>
                        )}
                      </div>
                    )}

                    <button
                      className="comic-btn"
                      style={{ width: "100%" }}
                      onClick={() => handleGenerateSceneImage(scene, index)}
                      disabled={generatingSceneIndex === index}
                    >
                      {generatingSceneIndex === index
                        ? "Generating Image..."
                        : "Generate Image"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!story.moral && (
            <div
              style={{
                marginBottom: "28px",
                border: "4px solid #000",
                borderRadius: "28px",
                padding: "22px",
                background: "#f8f8f8",
              }}
            >
              <h2 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "12px" }}>
                Moral
              </h2>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {story.moral}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: "14px", marginTop: "14px" }}>
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