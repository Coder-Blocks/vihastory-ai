"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { normalizeUsageData } from "../../lib/usage";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setProfile(normalizeUsageData(snap.data()));
      }
    };

    loadProfile();
  }, [user]);

  if (loading || !user || !profile) return null;

  const isPremium = (profile.plan || "Free") !== "Free";

  return (
    <main className="page-shell">
      <div className="center-wrap">
        <section className="comic-box" style={{ maxWidth: "820px", textAlign: "left" }}>
          <div className="comic-badge">Profile</div>
          <h1 className="title-main" style={{ fontSize: "44px" }}>
            VihaStory AI
          </h1>

          <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
            <div style={{ border: "3px solid #000", borderRadius: "18px", padding: "16px", background: "#f7f7f7" }}>
              <div style={{ fontWeight: 900 }}>Name</div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>
                {profile.fullName || user.displayName || "Not set"}
              </div>
            </div>

            <div style={{ border: "3px solid #000", borderRadius: "18px", padding: "16px", background: "#f7f7f7" }}>
              <div style={{ fontWeight: 900 }}>Email</div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>
                {profile.email || user.email}
              </div>
            </div>

            <div style={{ border: "3px solid #000", borderRadius: "18px", padding: "16px", background: isPremium ? "#fff7d6" : "#f7f7f7" }}>
              <div style={{ fontWeight: 900 }}>Plan</div>
              <div style={{ marginTop: "8px", fontWeight: 900, fontSize: "22px" }}>
                {profile.plan || "Free"} {isPremium ? "★" : ""}
              </div>
              <div style={{ marginTop: "8px", fontWeight: 700 }}>
                Usage: {profile.storiesUsedThisMonth ?? 0} / {profile.storyLimitPerMonth ?? 0}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "28px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="comic-btn" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </button>
            <button className="comic-btn secondary" onClick={() => router.push("/pricing")}>
              View Pricing
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}