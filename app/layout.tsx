import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SessionProvider } from "@/providers/SessionProvider";

/**
 * Root Layout Component
 *
 * Provides the base structure for the entire application:
 * - Global CSS imports and metadata
 * - Theme provider for dark/light mode support
 * - Session provider for authentication state
 * - Toast notifications setup
 * - Responsive viewport height handling
 */

export const metadata: Metadata = {
  title: "SEED - Retail Management System",
  description: "Comprehensive retail management solution for modern businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={cn("h-dvh w-full")}>
        <ThemeProvider>
          <SessionProvider>
            {children}
            {/* Global toast notifications */}
            <Toaster richColors={true} />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
