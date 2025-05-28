import { FcGoogle } from "react-icons/fc";
import { Button } from "./ui/button";
import { createSupabaseClient } from "@/supabase/client";

export default function LoginWithGoogle({
  type = "login",
}: {
  type?: "login" | "signup";
}) {
  const loginWithGoogle = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };
  return (
    <Button
      type="button"
      onClick={loginWithGoogle}
      variant="outline"
      className="w-full"
    >
      <FcGoogle />
      {`${type == "login" ? "Login" : "Sign Up"} with Google`}
    </Button>
  );
}
