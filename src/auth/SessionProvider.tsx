import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function acceptPendingInviteIfAny(session: Session | null) {
  if (!session) return;
  const { error } = await supabase.rpc("hr_accept_my_pending_invite");
  // If there is no invite, the function returns false (no error). Any error here is non-fatal.
  if (error) {
    // Intentionally ignore to avoid breaking auth flows.
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const next = data.session ?? null;
      setSession(next);
      setIsLoading(false);
      await acceptPendingInviteIfAny(next);
    });

    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsLoading(false);
      await acceptPendingInviteIfAny(nextSession ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, isLoading }), [session, isLoading]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}