"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import SignOutButton from "./auth/SignOutButton";
import { Button } from "./ui/button";
import { UserRoundCogIcon } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";

interface UserButtonProps {
  className?: string;
}

const UserButton: React.FC<UserButtonProps> = ({ className }) => {
  const { user } = useSession();
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2)
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : user?.phone
        ? user.phone.replace(/^\+/, "").slice(0, 2)
        : "";
  if (user)
    return (
      <div className={cn("flex items-center", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage
                src={
                  user?.user_metadata.image || `/images/blankProfilePicture.jpg`
                }
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-3 py-2">
              {user?.user_metadata.full_name && (
                <span className="block font-medium text-sm text-gray-900 dark:text-gray-100">
                  {user?.user_metadata.full_name}
                </span>
              )}
              {user?.phone && (
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  +{user?.phone}
                </span>
              )}
              {user?.email && (
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {user?.email || user?.user_metadata.email}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-2 p-1">
              <Link href="/account_settings" prefetch={true}>
                <Button
                  variant={"outline"}
                  className="mx-auto w-full flex items-center justify-start"
                >
                  <UserRoundCogIcon />
                  Account Settings
                </Button>
              </Link>

              <SignOutButton className="mx-auto w-full flex items-center justify-start" />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
};

export default UserButton;
