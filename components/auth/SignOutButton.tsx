"use client";
import { signOutAction } from "@/actions/auth";
import { Loader2Icon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export default function SignOutButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  return (
    <Button
      onClick={() => {
        startSignOut(async () => {
          await signOutAction();
          router.push("/login");
        });
      }}
      disabled={signingOut}
      variant={"outline"}
      className={cn(`active:scale-90 ${className}`)}
    >
      {signingOut ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <LogOutIcon className="size-4" />
      )}
      {signingOut ? "Signing Out..." : "Sign Out"}
    </Button>
  );
}
