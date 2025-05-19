"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

import React from "react";

interface ThemeSwitchProps {
  className?: string;
}

const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();

  const switchTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTheme(theme === "dark" ? "light" : "dark");
    e.stopPropagation();
  };

  return (
    <button
      onClick={switchTheme}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors duration-200 ml-1",
        className
      )}
    >
      <Moon
        className={`absolute scale-0 dark:scale-100 transition-all duration-400 rotate-180 dark:rotate-0`}
      />
      <Sun
        className={`absolute scale-100 dark:scale-0 transition-all duration-400 dark:-rotate-180 rotate-0`}
      />
    </button>
  );
};

export default ThemeSwitch;
