import Header from "@/components/Header";
import Navbar from "@/components/NavBar";
import { ReactNode } from "react";
import { getCurrentBusinessId } from "@/actions/businesses";
import { BusinessProvider } from "@/providers/BusinessProvider";
import { DataProvider } from "@/providers/DataProvider";
import Main from "@/components/Main";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const businessId = await getCurrentBusinessId();
  const currentBusinessId = businessId as string;

  return (
    <Main className="w-full h-dvh min-h-dvh grid grid-rows-[auto_1fr] bg-background text-foreground">
      <DataProvider>
        <BusinessProvider currentBusinessId={currentBusinessId}>
          <div className="min-h-screen flex flex-row">
            <Navbar />
            <div className="flex flex-col flex-1">
              <Header />
              <div className="flex-1 overflow-y-scroll w-full p-3">
                {children}
              </div>
            </div>
          </div>
        </BusinessProvider>
      </DataProvider>
    </Main>
  );
}
