"use client";
import { Loader2Icon, LogOutIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { createSupabaseClient } from "@/supabase/client";
import { getErrorMessage } from "@/utils/utils";
import { toast } from "sonner";

export default function SignOutButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();
  const supabase = createSupabaseClient();

  return (
    <Button
      onClick={() => {
        startSignOut(async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            toast.error(getErrorMessage(error));
          } else {
            toast.success("Signed out !!");
          }
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
