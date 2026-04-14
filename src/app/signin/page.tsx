"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db, googleProvider } from "../../lib/firebase";

type FloatingWord = {
  id: number;
  x: number;
  y: number;
  word: string;
};

const floatingWordsSource = [
  "Hero",
  "Villain",
  "Story",
  "Dream",
  "Magic",
  "Thriller",
  "Legend",
  "Twist",
  "Adventure",
  "Mystery",
  "Fantasy",
  "Sci-Fi",
  "Comedy",
  "Horror",
  "Romance",
  "Action",
  "Kids",
];

async function ensureUserDoc(user: any) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      fullName: user.displayName || "",
      email: user.email || "",
      plan: "Free",
      storiesUsedThisMonth: 0,
      storyLimitPerMonth: 1,
      usageMonthKey: new Date().toISOString().slice(0, 7),
      authProvider: "google",
      createdAt: serverTimestamp(),
    });
  }
}

export default function SignInPage() {
  const router = useRouter();

  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (Math.random() > 0.22) return;

      const nextWord =
        floatingWordsSource[
          Math.floor(Math.random() * floatingWordsSource.length)
        ];

      const id = Date.now() + Math.floor(Math.random() * 100000);

      setFloatingWords((prev) => [
        ...prev.slice(-8),
        {
          id,
          x: event.clientX + 10,
          y: event.clientY + 10,
          word: nextWord,
        },
      ]);

      window.setTimeout(() => {
        setFloatingWords((prev) => prev.filter((item) => item.id !== id));
      }, 850);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signin failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");

    try {
      setGoogleLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email?.toLowerCase() || "";

      if (!userEmail.endsWith("@gmail.com")) {
        setError("Free plan access is only for Gmail accounts.");
        return;
      }

      await ensureUserDoc(result.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="bg-glow-one" />
      <div className="bg-glow-two" />

      {floatingWords.map((item) => (
        <div
          key={item.id}
          className="cursor-word"
          style={{ left: item.x, top: item.y }}
        >
          {item.word}
        </div>
      ))}

      <Link href="/" className="top-back-link">
        Back
      </Link>

      <div className="center-wrap">
        <section className="auth-box">
          <div className="comic-badge">Welcome Back</div>

          <h1 className="auth-title">VihaStory AI</h1>
          <p className="auth-subtitle">
            Sign in with Google or your existing credentials.
          </p>

          <button
            className="comic-btn secondary"
            type="button"
            style={{ width: "100%", marginBottom: "14px" }}
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? "Connecting Google..." : "Sign In with Google"}
          </button>

          <form onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="form-input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p style={{ color: "red", fontWeight: 700, marginBottom: "12px" }}>
                {error}
              </p>
            )}

            <button
              className="comic-btn"
              type="submit"
              style={{ width: "100%", marginTop: "6px" }}
              disabled={submitting}
            >
              {submitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="auth-footer">
            Do not have an account?{" "}
            <Link href="/signup" className="auth-link">
              Sign Up
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}