"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createSupabaseClient } from "@/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type SessionContextType = {
  user: User | null;
  session: Session | null;
  refreshSession: () => Promise<void>;
};
const sessionContext = createContext<SessionContextType>({
  user: null,
  session: null,
  refreshSession: async () => {},
});

export function SessionProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createSupabaseClient();

  const refreshSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]);

  useEffect(() => {
    refreshSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase, refreshSession]);

  return (
    <sessionContext.Provider value={{ user, session, refreshSession }}>
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
