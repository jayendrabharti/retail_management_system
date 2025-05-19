"use client";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import {
  BarChart3,
  CreditCard,
  Home,
  Package,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: Package,
    },
    {
      title: "Bills",
      href: "/bills",
      icon: CreditCard,
    },
    {
      title: "Parties",
      href: "/parties",
      icon: Users,
    },
    {
      title: "Analysis",
      href: "/analysis",
      icon: BarChart3,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <div
      className={`
        group
        hover:w-48 w-20 navbar backdrop-blur-lg h-full p-2.5 overflow-hidden
        transition-all duration-300 ease-in-out z-10 row-start-2 row-end-3 bg-sidebar
      `}
    >
      <ul className="flex flex-col h-full list-none p-0 min-w-max">
        {navItems.map((navLink, index) => {
          const active = pathname.startsWith(navLink.href);
          return (
            <li
              key={index}
              className="flex flex-row items-center cursor-pointer rounded-xl hover:bg-muted relative mb-2"
            >
              <Link
                href={navLink.href}
                className="flex flex-row items-center w-full h-full"
              >
                <navLink.icon
                  className={`${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"} size-8 p-1.5 m-2.5 rounded-lg peer`}
                />

                {/* Collapsed label */}
                <span
                  className={cn(
                    `absolute left-7 -translate-x-1/2 text-xs`,
                    active
                      ? "text-foreground top-[90%] font-bold"
                      : "text-muted-foreground top-[80%]",
                    `group-hover:opacity-0 group-hover:pointer-events-none transition-opacity duration-200`
                  )}
                >
                  {navLink.title}
                </span>

                {/* Expanded label */}
                <span
                  className={`
                  text-foreground opacity-0 pointer-events-none
                  group-hover:opacity-100 group-hover:pointer-events-auto
                  transition-opacity duration-200
                  ${active ? "text-foreground font-bold" : "text-muted-foreground"}`}
                >
                  {navLink.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Navbar;
