"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase as supabase, invalidateSupabaseClient } from "@/lib/supabase-client";
import type { User as SupaUser } from "@supabase/supabase-js";

type AuthContextType = {
  // user is `undefined` while the session check is pending, `null` once it
  // resolved to "no user", and an object once signed in. This lets pages
  // distinguish "still checking" from "signed out" and avoid hanging spinners.
  user: SupaUser | null | undefined;
  // role from the users table ('admin', 'treasurer', 'member', ...).
  // Resolved right after sign-in; null while pending or no user.
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType>({
  user: undefined,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupaUser | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // @ts-ignore - implicit any from Supabase auth session structure
    supabase()
      .auth.getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
        // Profile bootstrap + role resolution: make sure a row exists in the
        // users table for this account, then read its role so the UI can gate
        // admin-only actions (e.g. delete). Without the row, every staff
        // action fails with a row-level or foreign-key error. Role changes
        // stay admin-only via SQL; here we only guarantee the row exists.
        if (session?.user) {
          ensureProfile(session.user);
          resolveRole(session.user.id);
        }
      })
      .catch((err) => {
        // Never let a failed session check hang the whole UI — treat as signed out.
        console.error("[AuthProvider] getSession failed:", err);
        setUser(null);
        setLoading(false);
      });

    // Safety net: if the session check never settles (broken backend, offline,
    // or a library bug), unstick the UI after 5 seconds.
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // @ts-ignore - implicit any from Supabase event/session parameters
    const { data: authListener } = supabase().auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user as any);
        invalidateSupabaseClient();
        resolveRole((session.user as any).id);
      } else {
        setUser(null);
        setRole(null);
        invalidateSupabaseClient();
      }
    });

    return () => {
      clearTimeout(timeout);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase().auth.signOut();
  };

  async function resolveRole(uid: string) {
    try {
      const { data } = await supabase().from("users").select("role").eq("id", uid).single();
      setRole((data as { role?: string } | null)?.role ?? null);
    } catch {
      setRole(null);
    }
  }

  async function ensureProfile(u: SupaUser) {
    try {
      // Only act when no users row exists yet for this account (first login
      // after the schema setup, where the signup profile insert was blocked).
      const { count } = await supabase().from("users").select("*", { count: "exact", head: true }).eq("id", u.id);
      if (count === null || count === 0) {
        const { error } = await supabase().from("users").insert({ id: u.id, email: u.email });
        if (error) console.warn("[AuthProvider] profile bootstrap insert failed:", error.message);
      }
    } catch (err) {
      console.warn("[AuthProvider] profile bootstrap skipped:", err);
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
