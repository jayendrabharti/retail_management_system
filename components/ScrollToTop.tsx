"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToTopProps {
  mainRef: React.RefObject<HTMLElement | null>;
}

export default function ScrollToTop({ mainRef }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.scrollTop > 100) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    const currentRef = mainRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", toggleVisibility);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener("scroll", toggleVisibility);
      }
    };
  }, [mainRef]);

  const scrollToTop = () => {
    mainRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={() => {
        if (isVisible) scrollToTop();
      }}
      className={cn(
        `fixed z-[1000000] bottom-6 right-6 p-2 rounded-full bg-zinc-600  text-white shadow-lg duration-200 transition-all cursor-pointer`,
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <ArrowUp className="size-6 sm:size-8" />
    </button>
  );
}
