"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase as supabase, invalidateSupabaseClient } from "@/lib/supabase-client";
import type { User as SupaUser } from "@supabase/supabase-js";

type AuthContextType = {
  user: SupaUser | null | undefined;
  role: string | null;
  isApproved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  role: null,
  isApproved: false,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupaUser | null | undefined>(undefined);
  const [role, setRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase()
      .auth.getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          ensureProfile(session.user);
          resolveRole(session.user.id);
        }
      })
      .catch((err) => {
        console.error("[AuthProvider] getSession failed:", err);
        setUser(null);
        setLoading(false);
      });

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: authListener } = supabase().auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user as any);
        invalidateSupabaseClient();
        resolveRole((session.user as any).id);
      } else {
        setUser(null);
        setRole(null);
        setIsApproved(false);
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
      const { data } = await supabase().from("users").select("role, is_approved").eq("id", uid).single();
      setRole((data as any)?.role ?? null);
      setIsApproved((data as any)?.is_approved ?? false);
    } catch {
      setRole(null);
      setIsApproved(false);
    }
  }

  async function ensureProfile(u: SupaUser) {
    try {
      const { count } = await supabase().from("users").select("*", { count: "exact", head: true }).eq("id", u.id);
      if (count === null || count === 0) {
        await supabase().from("users").insert({ id: u.id, email: u.email });
      }
    } catch (err) {
      console.warn("[AuthProvider] profile bootstrap skipped:", err);
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, isApproved, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
