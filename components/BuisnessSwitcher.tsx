"use client";

import { Building2Icon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "./ui/separator";
import AddNewBusiness from "./AddNewBusiness";
import { useCurrentBusiness } from "@/providers/BusinessProvider";
import { FaCheck } from "react-icons/fa";
import Link from "next/link";
import { Button } from "./ui/button";

export default function BusinessSwitcher({ expanded }: { expanded: boolean }) {
  const { businessId, switchBusinessId, businesses } = useCurrentBusiness();

  const selectedBusiness = businesses.find((b) => b.id === businessId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            "group-hover:bg-muted relative flex cursor-pointer flex-row items-center gap-4 rounded-xl p-2",
            expanded ? "bg-muted" : "",
          )}
        >
          <Avatar className="size-10">
            <AvatarImage
              src={selectedBusiness?.logoImage || ""}
              alt={selectedBusiness?.name || ""}
            />
            <AvatarFallback
              className={cn("text-background bg-primary text-xs")}
            >
              {selectedBusiness?.name?.slice(0, 2).toUpperCase() || "NA"}
            </AvatarFallback>
          </Avatar>

          <span
            className={cn(
              `text-foreground pointer-events-none w-max truncate opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100`,
              expanded ? "pointer-events-auto opacity-100" : "",
            )}
          >
            {selectedBusiness?.name || "Select Business"}
          </span>

          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        {businesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            onSelect={async () => {
              await switchBusinessId({ id: business.id });
            }}
            className={cn(
              "cursor-pointer py-2",
              businessId === business.id && "border-muted-foreground border-2",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={business.logoImage || ""}
                    alt={business.name}
                  />
                  <AvatarFallback
                    className={cn("text-background bg-primary text-xs")}
                  >
                    {business.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{business.name}</span>
              </div>
              {businessId === business.id && (
                <FaCheck className="ml-2 h-4 w-4" />
              )}
              {/* <Check className="h-4 w-4 ml-2" />} */}
            </div>
          </DropdownMenuItem>
        ))}
        <Separator className="my-2" />
        <div className="flex flex-col space-y-1">
          <AddNewBusiness />
          <Link href={"/businesses"} className="w-full">
            <Button className="w-full">
              <Building2Icon className="h-4 w-4" />
              Manage Businesses
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
