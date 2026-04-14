"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
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

export default function SignUpPage() {
  const router = useRouter();

  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([]);
  const [fullName, setFullName] = useState("");
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your Gmail address.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@gmail.com")) {
      setError("Free plan signup allows Gmail accounts only.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setSubmitting(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullName,
        email: normalizedEmail,
        plan: "Free",
        storiesUsedThisMonth: 0,
        storyLimitPerMonth: 1,
        usageMonthKey: new Date().toISOString().slice(0, 7),
        authProvider: "password",
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
          <div className="comic-badge">Create Account</div>

          <h1 className="auth-title">VihaStory AI</h1>
          <p className="auth-subtitle">
            Free plan is available only for Gmail accounts.
          </p>

          <button
            className="comic-btn secondary"
            type="button"
            style={{ width: "100%", marginBottom: "14px" }}
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
          >
            {googleLoading ? "Connecting Google..." : "Continue with Google"}
          </button>

          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                className="form-input"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signupEmail">
                Gmail
              </label>
              <input
                id="signupEmail"
                className="form-input"
                type="email"
                placeholder="Enter your Gmail address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signupPassword">
                Password
              </label>
              <input
                id="signupPassword"
                className="form-input"
                type="password"
                placeholder="Create a password"
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
              {submitting ? "Creating..." : "Sign Up"}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{" "}
            <Link href="/signin" className="auth-link">
              Sign In
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}