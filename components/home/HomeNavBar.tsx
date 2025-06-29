"use client";
import { cn } from "@/lib/utils";
import ThemeSwitch from "../ThemeSwitch";
import { anurati } from "@/utils/fonts";
import UserButton from "../UserButton";
import { useSession } from "@/providers/SessionProvider";
import { Button } from "../ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  title: string;
  href: string;
  matchTo: string[];
}

export default function HomeNavbar() {
  const { user } = useSession();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      title: "Home",
      href: "/home",
      matchTo: ["/", "/home"],
    },
    {
      title: "Pricing",
      href: "/pricing",
      matchTo: ["/pricing"],
    },
    {
      title: "About us",
      href: "/about_us",
      matchTo: ["/about_us"],
    },
    ...(user
      ? [
          {
            title: "Dashboard",
            href: "/dashboard",
            matchTo: ["/dashboard"],
          },
        ]
      : []),
  ];

  return (
    <nav className="border-b border-border shadow-md sticky top-0 left-0 backdrop-blur z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16 space-x-3">
        <Link
          href={"/"}
          className={cn("text-foreground text-xl font-bold", anurati.className)}
        >
          SEED
        </Link>

        <div className="flex flex-row ml-auto space-x-2 items-center">
          {navItems.map((link, index) => {
            const active = link.matchTo.includes(pathname);
            return (
              <Link
                key={index}
                href={link.href}
                className={cn(
                  "px-3 py-0.5 rounded-full",
                  "active:scale-95",
                  "transition-all duration-200",
                  active
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {link.title}
              </Link>
            );
          })}

          {user ? (
            <UserButton />
          ) : (
            <Link href={"/login"}>
              <Button variant={"secondary"}>Log In</Button>
            </Link>
          )}

          <ThemeSwitch />
        </div>
      </div>
    </nav>
  );
}
