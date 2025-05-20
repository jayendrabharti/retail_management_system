"use client";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import ThemeSwitch from "./ThemeSwitch";
import UserButton from "./UserButton";

export default function Header() {
  const pathname = usePathname();
  const pageName = pathname
    .split("/")
    .pop()
    ?.replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, " ");

  return (
    <header className={cn("bg-sidebar p-3 flex flex-row items-center")}>
      <span className="font-bold text-2xl">{pageName}</span>
      <ThemeSwitch className="ml-auto" />
      <UserButton className="ml-4" />
    </header>
  );
}
