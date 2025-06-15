"use client";
import { useState, useEffect } from "react";

export default function AnimatedText({
  text,
  className = "",
  type = "element",
  delay = 0,
  interval = 100,
}: {
  text: string;
  className?: string;
  type?: "element" | "text";
  delay?: number;
  interval?: number;
}) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let currentIndex = 0;
    setDisplayText(""); // Reset on text change

    if (!text) return;

    const timeout = setTimeout(() => {
      const intv = setInterval(() => {
        setDisplayText((prev) => {
          const next = text.slice(0, currentIndex + 1);
          currentIndex++;
          if (currentIndex >= text.length) {
            clearInterval(intv);
          }
          return next;
        });
      }, interval);

      // Cleanup interval on unmount or text change
      return () => clearInterval(intv);
    }, delay);

    // Cleanup timeout on unmount or text change
    return () => clearTimeout(timeout);
  }, [text, delay, interval]);

  if (type == "text") return displayText;
  return <span className={className}>{displayText}</span>;
}
