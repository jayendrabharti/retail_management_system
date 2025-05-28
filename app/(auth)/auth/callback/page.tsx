"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { LoaderCircleIcon } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/unauthorized");
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="w-full h-full flex items-center justify-center flex-col gap-4">
      <LoaderCircleIcon className="animate-spin size-20" />
      <span className="text-3xl font-bold">Loading...</span>
    </div>
  );
}
