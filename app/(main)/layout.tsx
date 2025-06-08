import Header from "@/components/Header";
import Navbar from "@/components/NavBar";
import { ReactNode } from "react";
import { getCurrentBusinessId } from "@/actions/businesses";
import { BusinessProvider } from "@/providers/BusinessProvider";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const businessId = await getCurrentBusinessId();
  const currentBusinessId = businessId as string;

  return (
    <BusinessProvider currentBusinessId={currentBusinessId}>
      <div className="min-h-screen flex flex-row">
        <Navbar />
        <div className="flex flex-col flex-1">
          <Header />
          <div className="flex-1 overflow-y-scroll w-full p-2">{children}</div>
        </div>
      </div>
    </BusinessProvider>
  );
}
