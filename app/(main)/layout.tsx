import Header from "@/components/Header";
import Navbar from "@/components/NavBar";
import { ReactNode } from "react";
import { BusinessProvider } from "@/providers/BusinessProvider";
import { DataProvider } from "@/providers/DataProvider";
import Main from "@/components/Main";

/**
 * Main Application Layout
 *
 * Layout for authenticated users accessing the main application features.
 * Provides the core application structure with:
 * - Business context for multi-tenant operations
 * - Data provider for UI state management
 * - Responsive sidebar navigation
 * - Top header with user controls
 * - Main content area with scrolling
 */

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Main className="bg-background text-foreground grid h-dvh min-h-dvh w-full grid-rows-[auto_1fr]">
      <DataProvider>
        <BusinessProvider>
          <div className="flex min-h-screen flex-row">
            {/* Collapsible sidebar navigation */}
            <Navbar />

            <div className="flex flex-1 flex-col">
              {/* Top header with user controls and notifications */}
              <Header />

              {/* Main content area with scrolling */}
              <div className="w-full flex-1 overflow-y-scroll p-3">
                {children}
              </div>
            </div>
          </div>
        </BusinessProvider>
      </DataProvider>
    </Main>
  );
}
