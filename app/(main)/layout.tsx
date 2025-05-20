import Header from "@/components/Header";
import Navbar from "@/components/NavBar";
import { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-row">
      <Navbar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-y-scroll w-full p-2">{children}</main>
      </div>
    </div>
  );
}
