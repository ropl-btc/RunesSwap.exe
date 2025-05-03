"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./Layout.module.css";

// Constants
const DEFAULT_TITLE = "RunesSwap.app";
const ROTATION_INTERVAL = 20000; // 20 seconds
const FADE_DURATION = 300; // 300ms

// Funny texts to cycle through randomly
const FUNNY_TEXTS = [
  "Runes go brrr...",
  "Powered by magic internet money (not the rune)",
  "Click here for free BTC (jk)",
  "Windows 98 > Windows 11",
  "Satoshi was here",
  "Ordinals are just fancy JPEGs",
  "Hodl my runes, I'm going in!",
  "Probably nothing...",
  "Wen moon?",
  "Have you tried turning it off and on again?",
  "Ordinals > NFTs, change my mind",
  "Runes: Like memecoins but cooler",
  "Inscribing my way to the moon",
  "Bitcoin: The OG meme coin",
  "Loading funny text...",
  "Insert coin to continue",
  "RunesSwap.exe has stopped working (chill)",
  "Ctrl+Alt+Swap",
  "Liquidium is the best",
  "Over 4,000 BTC in loan volume on Liquidium",
  "Liquidium did over 94k loans",
];

export function TitleText() {
  const [currentText, setCurrentText] = useState(DEFAULT_TITLE);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const textsRef = useRef(shuffleTexts());
  const indexRef = useRef(0);

  // Shuffle texts and return a new array
  function shuffleTexts() {
    return [...FUNNY_TEXTS].sort(() => Math.random() - 0.5);
  }

  // Handle text rotation
  useEffect(() => {
    // Initial delay - show default title first
    const initialTimer = setTimeout(changeText, ROTATION_INTERVAL);

    function changeText() {
      setIsTransitioning(true);

      setTimeout(() => {
        // If we've shown all texts, reshuffle
        if (indexRef.current >= textsRef.current.length) {
          textsRef.current = shuffleTexts();
          indexRef.current = 0;
        }

        // Set the next text and increment index
        setCurrentText(textsRef.current[indexRef.current++]);
        setIsTransitioning(false);
      }, FADE_DURATION);
    }

    // Only set up interval after first change
    let interval: NodeJS.Timeout | null = null;
    if (currentText !== DEFAULT_TITLE) {
      interval = setInterval(changeText, ROTATION_INTERVAL);
    }

    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, [currentText]);

  return (
    <span
      className={styles.titleText}
      style={{ opacity: isTransitioning ? 0 : 1 }}
    >
      {currentText}
    </span>
  );
}

export default TitleText;
