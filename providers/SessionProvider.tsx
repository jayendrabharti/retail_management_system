"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createSupabaseClient } from "@/supabase/client";
import { Session } from "@supabase/supabase-js";

type SessionContextType = {
  session: Session | null;
  refreshSession: () => Promise<void>;
};
const sessionContext = createContext<SessionContextType>({
  session: null,
  refreshSession: async () => {},
});

export function SessionProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, setSession] = useState<Session | null>(null);
  const supabase = createSupabaseClient();

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session ?? null);
  }, [supabase]);

  useEffect(() => {
    // Get current user on mount
    refreshSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session ?? null);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase, refreshSession]);

  return (
    <sessionContext.Provider value={{ session, refreshSession }}>
      {children}
    </sessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(sessionContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
