import Header from "@/components/Header";
import Navbar from "@/components/NavBar";
import { ReactNode } from "react";
import { BusinessProvider } from "@/providers/BusinessProvider";
import { DataProvider } from "@/providers/DataProvider";
import Main from "@/components/Main";

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
            <Navbar />
            <div className="flex flex-1 flex-col">
              <Header />
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
