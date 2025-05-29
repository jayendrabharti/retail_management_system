"use client";

import { Check, ChevronsUpDown } from "lucide-react";
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

export default function BusinessSwitcher() {
  const { businessId, switchBusinessId, businesses } = useCurrentBusiness();

  const selectedBusiness = businesses.find((b) => b.id === businessId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            "flex flex-row items-center gap-4 cursor-pointer rounded-xl group-hover:bg-muted relative p-2"
          )}
        >
          <Avatar className="size-10">
            {/* <AvatarImage
              src={"/placeholder.svg"}
              alt={selectedBusiness?.name || ""}
            /> */}
            <AvatarFallback
              className={cn("text-xs text-background bg-primary")}
            >
              {selectedBusiness?.name?.slice(0, 2).toUpperCase() || "NA"}
            </AvatarFallback>
          </Avatar>

          <span
            className={`truncate
                  text-foreground opacity-0 pointer-events-none
                  group-hover:opacity-100 group-hover:pointer-events-auto
                  transition-opacity duration-200 w-max`}
          >
            {selectedBusiness?.name || "Select Business"}
          </span>

          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {businesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            onSelect={async () => {
              await switchBusinessId({ id: business.id });
            }}
            className="cursor-pointer py-2"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {/* <AvatarImage src={"/placeholder.svg"} alt={business.name} /> */}
                  <AvatarFallback
                    className={cn("text-xs text-background bg-primary")}
                  >
                    {business.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{business.name}</span>
              </div>
              {businessId === business.id && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}
        <Separator className="my-2" />
        <AddNewBusiness switchBusinessId={switchBusinessId} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
