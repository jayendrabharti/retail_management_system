import Navbar from "@/components/NavBar";
import { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-row">
      <Navbar />
      <main className="flex-1 container mx-auto px-2 py-4">{children}</main>
    </div>
  );
}
