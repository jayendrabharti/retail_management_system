"use client";
import { BellIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "./ui/separator";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Notifications({ className }: { className?: string }) {
  const [unread, setUnread] = useState(0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant={"outline"}
          size={"icon"}
          className={cn("relative rounded-full", className)}
        >
          <BellIcon />
          <Badge
            className={cn(
              "h-5 min-w-5 rounded-full px-1 font-mono tabular-nums absolute bottom-full left-full -translate-x-2/3 translate-y-2/3",
              unread ? "visible" : "hidden"
            )}
          >
            {unread}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications ({unread})</SheetTitle>
          <SheetDescription>
            All the notifications for the current business show up here.
          </SheetDescription>
          <Separator />
        </SheetHeader>

        <SheetFooter>
          <Link href={"/notifications"} prefetch={true}>
            <Button type="submit" className="w-full">
              All Notifications
              <ExternalLinkIcon />
            </Button>
          </Link>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
