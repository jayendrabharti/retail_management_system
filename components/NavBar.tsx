"use client";

import { usePathname } from "next/navigation";
import React, { Fragment } from "react";
import { BarChart3, Package, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Separator } from "./ui/separator";
import { LuLayoutDashboard } from "react-icons/lu";
import { PiInvoiceDuotone } from "react-icons/pi";
import BusinessSwitcher from "./BuisnessSwitcher";
import { useData } from "@/providers/DataProvider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export default function Navbar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LuLayoutDashboard,
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: Package,
    },
    {
      title: "Billing",
      href: "/bills",
      icon: PiInvoiceDuotone,
      // icon: CreditCard,
    },
    {
      title: "Parties",
      href: "/parties",
      icon: Users,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const { expanded } = useData();

  return (
    <div
      className={cn(
        `group flex flex-col
        hover:w-60 w-19 navbar backdrop-blur-lg p-2.5 overflow-hidden
        transition-all duration-300 ease-in-out z-10 row-start-2 row-end-3 bg-sidebar max-h-screen`,
        expanded ? "w-60" : ""
      )}
    >
      <BusinessSwitcher expanded={expanded} />
      <Separator className="my-2" />
      <div className="flex flex-col space-y-2 list-none p-0 min-w-max flex-1 gap-1 transition-all duration-200">
        {navItems.map((navLink, index) => {
          const active = pathname.startsWith(navLink.href);
          return (
            <Fragment key={index}>
              {index === navItems.length - 1 && <Separator className="mt-3" />}
              <Link
                href={navLink.href}
                className={cn(
                  "flex flex-row items-center cursor-pointer rounded-xl hover:bg-muted relative"
                )}
                prefetch={true}
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
                    `group-hover:opacity-0 group-hover:pointer-events-none transition-opacity duration-200`,
                    expanded ? "opacity-0 pointer-events-none" : ""
                  )}
                >
                  {navLink.title}
                </span>

                {/* Expanded label */}
                <span
                  className={cn(
                    `
                    text-foreground opacity-0 pointer-events-none
                    group-hover:opacity-100 group-hover:pointer-events-auto
                    transition-opacity duration-200`,
                    active
                      ? "text-foreground font-bold"
                      : "text-muted-foreground",
                    expanded ? "opacity-100 pointer-events-auto" : ""
                  )}
                >
                  {navLink.title}
                </span>
              </Link>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
