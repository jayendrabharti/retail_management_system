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

/**
 * Main Navigation Sidebar Component
 *
 * Features:
 * - Collapsible sidebar with hover expansion
 * - Business switcher integration
 * - Active route highlighting
 * - Responsive design with icon-only collapsed state
 * - Smooth animations and transitions
 */

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export default function Navbar() {
  const pathname = usePathname();

  // Main navigation items for the retail management system
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
    },
    {
      title: "Parties", // Customers & Suppliers
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
    <nav
      className={cn(
        `group navbar bg-sidebar z-10 row-start-2 row-end-3 flex max-h-screen w-19 flex-col overflow-hidden p-2.5 backdrop-blur-lg transition-all duration-300 ease-in-out hover:w-60`,
        expanded ? "w-60" : "",
      )}
    >
      {/* Business Switcher at the top */}
      <BusinessSwitcher expanded={expanded} />
      <Separator className="my-2" />

      {/* Main navigation items */}
      <div className="flex min-w-max flex-1 list-none flex-col gap-1 space-y-2 p-0 transition-all duration-200">
        {navItems.map((navLink, index) => {
          const active = pathname.startsWith(navLink.href);
          return (
            <Fragment key={index}>
              {/* Separator before settings (last item) */}
              {index === navItems.length - 1 && <Separator className="mt-3" />}
              <Link
                href={navLink.href}
                className={cn(
                  "hover:bg-muted relative flex cursor-pointer flex-row items-center rounded-xl",
                )}
                prefetch={true}
              >
                {/* Navigation icon */}
                <navLink.icon
                  className={`${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"} peer m-2.5 size-8 rounded-lg p-1.5`}
                />

                {/* Collapsed state label (shows below icon when sidebar is collapsed) */}
                <span
                  className={cn(
                    `absolute left-7 -translate-x-1/2 text-xs`,
                    active
                      ? "text-foreground top-[90%] font-bold"
                      : "text-muted-foreground top-[80%]",
                    `transition-opacity duration-200 group-hover:pointer-events-none group-hover:opacity-0`,
                    expanded ? "pointer-events-none opacity-0" : "",
                  )}
                >
                  {navLink.title}
                </span>

                {/* Expanded label */}
                <span
                  className={cn(
                    `text-foreground pointer-events-none opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100`,
                    active
                      ? "text-foreground font-bold"
                      : "text-muted-foreground",
                    expanded ? "pointer-events-auto opacity-100" : "",
                  )}
                >
                  {navLink.title}
                </span>
              </Link>
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
