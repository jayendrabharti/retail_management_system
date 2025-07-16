import Link from "next/link";
import ThemeSwitch from "../ThemeSwitch";
import { cn } from "@/lib/utils";
import { anurati } from "@/utils/fonts";

export default function AuthHeader() {
  return (
    <header className="bg-background border-b border-border shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        {/* Logo */}

        <Link
          href={"/"}
          className={cn("text-foreground text-xl font-bold", anurati.className)}
        >
          SEED
        </Link>

        <ThemeSwitch />
      </div>
    </header>
  );
}
