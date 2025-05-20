"use client";

import React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Business {
  id: string;
  name: string;
  logo?: string;
  color?: string;
}

interface BusinessSwitcherProps {
  className?: string;
}

const BusinessSwitcher: React.FC<BusinessSwitcherProps> = ({ className }) => {
  const [currentBusiness, setCurrentBusiness] = React.useState<number>(0);

  const businesses: Business[] = [
    { id: "1", name: "Acme Corp", color: "bg-blue-500" },
    { id: "2", name: "Beta Traders", color: "bg-emerald-500" },
    { id: "3", name: "Gamma Supplies", color: "bg-amber-500" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            "flex flex-row items-center gap-4 cursor-pointer rounded-xl group-hover:bg-muted relative p-2"
          )}
        >
          <Avatar className="size-10">
            <AvatarImage
              src={businesses[currentBusiness]?.logo || "/placeholder.svg"}
              alt={businesses[currentBusiness]?.name}
            />
            <AvatarFallback
              className={cn(
                "text-xs text-white",
                businesses[currentBusiness]?.color
              )}
            >
              {businesses[currentBusiness]?.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span
            className={`truncate
                  text-foreground opacity-0 pointer-events-none
                  group-hover:opacity-100 group-hover:pointer-events-auto
                  transition-opacity duration-200 w-max`}
          >
            {businesses[currentBusiness]?.name || "Select Business"}
          </span>

          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {businesses.map((business, idx) => (
          <DropdownMenuItem
            key={business.id}
            onSelect={() => setCurrentBusiness(idx)}
            className="cursor-pointer py-2"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={business.logo || "/placeholder.svg"}
                    alt={business.name}
                  />
                  <AvatarFallback
                    className={cn("text-xs text-white", business.color)}
                  >
                    {business.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{business.name}</span>
              </div>
              {currentBusiness === idx && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem className="cursor-pointer py-2">
          <div className="flex w-full items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>Add new business</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BusinessSwitcher;

// <Button
//   variant="outline"
//   className={cn("justify-between px-3 border-0 bg-none", className)}
// >
//   <div className="flex items-center gap-2">
//     <Avatar className="size-12">
//       <AvatarImage
//         src={businesses[currentBusiness]?.logo || "/placeholder.svg"}
//         alt={businesses[currentBusiness]?.name}
//       />
//       <AvatarFallback
//         className={cn("text-xs text-white", businesses[currentBusiness]?.color)}
//       >
//         {businesses[currentBusiness]?.name.slice(0, 2).toUpperCase()}
//       </AvatarFallback>
//     </Avatar>
//     <span className="truncate">
//       {businesses[currentBusiness]?.name || "Select Business"}
//     </span>
//   </div>
//   <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
// </Button>;
