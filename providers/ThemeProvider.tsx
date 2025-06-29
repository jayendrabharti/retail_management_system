"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: Readonly<{
  children: React.ReactNode;
  defaultTheme?: "light" | "dark";
}>) {
  return (
    <NextThemeProvider
      attribute="class"
      storageKey="theme"
      defaultTheme={defaultTheme}
      disableTransitionOnChange={true}
    >
      {children}
    </NextThemeProvider>
  );
}
