import {
  HomeIcon,
  LayoutDashboardIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import SignOutButton from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";

export default async function AuthorizedPage() {
  return (
    <>
      <span className="flex flex-col md:flex-row text-center items-center gap-2 text-xl md:text-5xl font-bold  text-emerald-500">
        <UserRoundCheckIcon className="size-16" />
        You are already Logged In
      </span>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant={"outline"} className="active:scale-90">
          <HomeIcon className="size-4" />
          <Link href={"/"} prefetch={true}>
            Homepage
          </Link>
        </Button>
        <Button variant={"outline"} className="active:scale-90">
          <LayoutDashboardIcon className="size-4" />
          <Link href={"/dashboard"} prefetch={true}>
            Dashboard
          </Link>
        </Button>

        <SignOutButton />
      </div>
    </>
  );
}
