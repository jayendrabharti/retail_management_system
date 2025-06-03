"use client";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import ThemeSwitch from "./ThemeSwitch";
import UserButton from "./UserButton";
// import FullScreenButton from "./FullScreenButton";
import { GoSidebarExpand } from "react-icons/go";
import { GoSidebarCollapse } from "react-icons/go";
import { Button } from "./ui/button";
import { useData } from "@/providers/DataProvider";

export default function Header() {
  const pathname = usePathname();
  const pageName = pathname
    .split("/")
    .pop()
    ?.replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, " ");

  const { expanded, setExpanded } = useData();

  return (
    <header
      className={cn("bg-sidebar p-4 flex flex-row items-center space-x-4")}
    >
      <Button
        variant={"outline"}
        size={"icon"}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? <GoSidebarExpand /> : <GoSidebarCollapse />}
      </Button>

      <span className="mr-auto font-bold text-2xl">{pageName}</span>

      {/* <FullScreenButton /> */}
      <ThemeSwitch />
      <UserButton />
    </header>
  );
}
