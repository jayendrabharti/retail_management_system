import {
  HomeIcon,
  LogInIcon,
  UserPlusIcon,
  UserRoundXIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function UnauthorizedPage() {
  return (
    <>
      <span className="flex flex-col md:flex-row text-center items-center gap-2 text-xl md:text-5xl font-bold  text-destructive">
        <UserRoundXIcon className="size-16" />
        Unauthorized
      </span>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant={"outline"} className="active:scale-90">
          <HomeIcon className="size-4" />
          <Link href={"/"} prefetch={true}>
            Homepage
          </Link>
        </Button>

        <Button variant={"outline"} className="active:scale-90">
          <LogInIcon className="size-4" />
          <Link href={"/login"} prefetch={true}>
            Log In
          </Link>
        </Button>

        <Button variant={"outline"} className="active:scale-90">
          <UserPlusIcon className="size-4" />
          <Link href={"/signup"} prefetch={true}>
            Sign Up
          </Link>
        </Button>
      </div>
    </>
  );
}
