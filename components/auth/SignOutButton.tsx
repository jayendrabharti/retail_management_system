"use client";
import { signOutAction } from "@/actions/auth";
import { Loader2Icon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export default function SignOutButton() {
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  return (
    <Button
      onClick={() => {
        startSignOut(async () => {
          await signOutAction();
          router.refresh();
        });
      }}
      disabled={signingOut}
      variant={"outline"}
      className="active:scale-90"
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
