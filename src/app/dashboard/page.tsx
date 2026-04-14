"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import type { StoryListItem } from "../../types/story";

type UserProfile = {
  fullName?: string;
  email?: string;
  plan?: string;
  storiesUsedThisMonth?: number;
  storyLimitPerMonth?: number;
};

function formatDate(value: any) {
  try {
    if (value?.toDate) {
      return value.toDate().toLocaleString();
    }
    if (typeof value === "number") {
      return new Date(value).toLocaleString();
    }
    return "Recently";
  } catch {
    return "Recently";
  }
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setPageLoading(true);

        // Load user profile
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data() as UserProfile);
        }

        // Load all stories, then filter current user's stories
        const storiesRef = collection(db, "stories");
        const storiesSnap = await getDocs(storiesRef);

        const items: StoryListItem[] = storiesSnap.docs
          .map((docItem) => ({
            id: docItem.id,
            ...(docItem.data() as Omit<StoryListItem, "id">),
          }))
          .filter((item) => item.userId === user.uid)
          .sort((a, b) => {
            const aTime =
              a.createdAtServer?.toDate?.()?.getTime?.() ??
              (typeof a.createdAt === "number" ? a.createdAt : 0);

            const bTime =
              b.createdAtServer?.toDate?.()?.getTime?.() ??
              (typeof b.createdAt === "number" ? b.createdAt : 0);

            return bTime - aTime;
          });

        setStories(items);
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        setPageLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const usageText = useMemo(() => {
    if (!userData) return "0 / 0";
    return `${userData.storiesUsedThisMonth ?? 0} / ${
      userData.storyLimitPerMonth ?? 0
    }`;
  }, [userData]);

  const canCreate =
    (userData?.storiesUsedThisMonth ?? 0) < (userData?.storyLimitPerMonth ?? 0);

  const handleDeleteStory = async (storyId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this story?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(storyId);
      await deleteDoc(doc(db, "stories", storyId));
      setStories((prev) => prev.filter((item) => item.id !== storyId));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete story.");
    } finally {
      setDeletingId(null);
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

  if (!user) return null;

  return (
    <main className="page-shell">
      <div className="center-wrap">
        <section
          className="comic-box"
          style={{ maxWidth: "1100px", textAlign: "left" }}
        >
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
              <div className="comic-badge">Dashboard</div>
              <h1 className="title-main" style={{ fontSize: "44px" }}>
                VihaStory AI
              </h1>
              <p className="subtitle" style={{ marginLeft: 0 }}>
                Welcome, {userData?.fullName || user.displayName || user.email}
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                className="comic-btn"
                onClick={() => router.push("/create-story")}
                disabled={!canCreate}
                style={{ opacity: canCreate ? 1 : 0.6 }}
              >
                Create Story
              </button>

              <button
                className="comic-btn secondary"
                onClick={() => router.push("/profile")}
              >
                Profile
              </button>

              <button
                className="comic-btn secondary"
                onClick={() => router.push("/pricing")}
              >
                View Pricing
              </button>

              <button
                className="comic-btn secondary"
                onClick={async () => {
                  await logout();
                  router.push("/signin");
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div
              style={{
                border: "3px solid #000",
                borderRadius: "18px",
                padding: "16px",
                background: "#f7f7f7",
              }}
            >
              <div style={{ fontWeight: 900 }}>Current Plan</div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>
                {userData?.plan || "Free"}
              </div>
            </div>

            <div
              style={{
                border: "3px solid #000",
                borderRadius: "18px",
                padding: "16px",
                background: "#f7f7f7",
              }}
            >
              <div style={{ fontWeight: 900 }}>Monthly Usage</div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>{usageText}</div>
            </div>

            <div
              style={{
                border: "3px solid #000",
                borderRadius: "18px",
                padding: "16px",
                background: "#f7f7f7",
              }}
            >
              <div style={{ fontWeight: 900 }}>Stories Saved</div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>
                {stories.length}
              </div>
            </div>
          </div>

          {!canCreate && (
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
              Your monthly story limit is reached. Upgrade your plan to continue.
            </div>
          )}

          <div style={{ marginTop: "30px" }}>
            <h2 style={{ marginBottom: "14px" }}>Your Story History</h2>

            {stories.length === 0 ? (
              <div
                style={{
                  border: "3px solid #000",
                  borderRadius: "18px",
                  padding: "20px",
                  background: "#f7f7f7",
                  fontWeight: 700,
                }}
              >
                No stories yet. Create your first story.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {stories.map((story) => (
                  <div
                    key={story.id}
                    style={{
                      border: "3px solid #000",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#f7f7f7",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "14px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: "22px" }}>
                          {story.generated?.title || "Untitled Story"}
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            fontWeight: 700,
                            opacity: 0.8,
                          }}
                        >
                          {story.genre || story.generated?.genre || "Story"} •{" "}
                          {story.language || story.generated?.language || "English"}
                        </div>
                        <div
                          style={{
                            marginTop: "8px",
                            fontWeight: 700,
                            opacity: 0.75,
                          }}
                        >
                          {formatDate(story.createdAtServer || story.createdAt)}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                          className="comic-btn"
                          onClick={() => router.push(`/story/${story.id}`)}
                        >
                          View Story
                        </button>

                        <button
                          className="comic-btn secondary"
                          onClick={() => handleDeleteStory(story.id)}
                          disabled={deletingId === story.id}
                        >
                          {deletingId === story.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>

                    {story.generated?.hook && (
                      <div
                        style={{
                          marginTop: "14px",
                          fontWeight: 700,
                          lineHeight: 1.6,
                        }}
                      >
                        {story.generated.hook}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}