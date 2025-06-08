"use client";
import { cn } from "@/lib/utils";
import ThemeSwitch from "./ThemeSwitch";
import UserButton from "./UserButton";
import Notifications from "./Notifications";
import { Separator } from "./ui/separator";
import BreadCrumb from "./BreadCrumb";
import NavExpandToggle from "./NavExpandToggle";

export default function Header() {
  return (
    <header
      className={cn("bg-sidebar p-3 flex flex-row items-center space-x-3")}
    >
      <NavExpandToggle />

      <Separator orientation={"vertical"} />

      <BreadCrumb />

      <Notifications className="ml-auto" />

      <ThemeSwitch />

      <UserButton />
    </header>
  );
}
