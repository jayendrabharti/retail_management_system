"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const { session } = useSession();
  const user = session?.user;

  if (session)
    return (
      <div className={cn("flex items-center", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage src={user?.user_metadata.image} />
              <AvatarFallback>JB</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-3 py-2">
              <span className="block font-medium text-sm text-gray-900 dark:text-gray-100">
                {user?.user_metadata.full_name}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                +{user?.phone}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {user?.email || user?.user_metadata.email}
              </span>
            </div>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-2 p-1">
              <Button
                variant={"outline"}
                className="mx-auto w-full flex items-center justify-start"
              >
                <UserRoundCogIcon />
                <Link href="/account_settings">Account Settings</Link>
              </Button>
              <SignOutButton className="mx-auto w-full flex items-center justify-start" />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
};

export default UserButton;
