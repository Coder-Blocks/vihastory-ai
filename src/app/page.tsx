"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { homePosters } from "../data/homePosters";

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

export default function HomePage() {
  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([]);

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

  return (
    <main className="page-shell">
      <div className="bg-glow-one" />
      <div className="bg-glow-two" />

      <div className="poster-background">
        {homePosters.map((poster) => (
          <div
            key={poster.id}
            className="story-poster"
            style={
              {
                top: poster.top,
                left: poster.left,
                width: poster.width,
                height: poster.height,
                ["--poster-angle" as string]: `${poster.angle}deg`,
              } as React.CSSProperties
            }
          >
            <div className="story-poster-inner">
              <div className="story-poster-genre">{poster.genre}</div>

              <div className="story-poster-art">
                <div className="story-poster-moon" />
                <div className="story-poster-character hero" />
                <div className="story-poster-character villain" />
              </div>

              <div className="story-poster-title">{poster.title}</div>
            </div>
          </div>
        ))}
      </div>

      {floatingWords.map((item) => (
        <div
          key={item.id}
          className="cursor-word"
          style={{ left: item.x, top: item.y }}
        >
          {item.word}
        </div>
      ))}

      <div className="center-wrap">
        <section className="comic-box">
          <div className="comic-badge">Comic Story Engine</div>

          <h1 className="title-main">VihaStory AI</h1>

          <p className="subtitle">
            Turn your imagination into a comic story universe.
          </p>

          <div className="button-row">
            <Link href="/signin">
              <button className="comic-btn" type="button">
                Sign In
              </button>
            </Link>

            <Link href="/signup">
              <button className="comic-btn secondary" type="button">
                Sign Up
              </button>
            </Link>
          </div>

          <div className="story-line">
            Black and white • comic feel • cinematic story world
          </div>
        </section>
      </div>
    </main>
  );
}