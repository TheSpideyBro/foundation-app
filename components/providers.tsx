"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase as supabase, invalidateSupabaseClient } from "@/lib/supabase-client";
import type { User as SupaUser } from "@supabase/supabase-js";

type AuthContextType = {
  user: SupaUser | null | undefined;
  role: string | null;
  isApproved: boolean;
  memberId: string | null;
  phone: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  role: null,
  isApproved: false,
  memberId: null,
  phone: null,
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
  const [memberId, setMemberId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase()
      .auth.getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await ensureProfile(session.user);
          await resolveRole(session.user.id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[AuthProvider] getSession failed:", err);
        setUser(null);
        setLoading(false);
      });

    const { data: authListener } = supabase().auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user as any);
        invalidateSupabaseClient();
        await resolveRole((session.user as any).id);
      } else {
        setUser(null);
        setRole(null);
        setIsApproved(false);
        setMemberId(null);
        setPhone(null);
        invalidateSupabaseClient();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase().auth.signOut();
  };

  async function resolveRole(uid: string) {
    try {
      const { data } = await supabase().from("users").select("role, is_approved, member_id, phone").eq("id", uid).single();
      if (data) {
        setRole(data.role);
        setIsApproved(data.is_approved);
        setMemberId(data.member_id);
        setPhone(data.phone);
      }
    } catch (err) {
      console.error("[AuthProvider] resolveRole failed:", err);
      setRole(null);
      setIsApproved(false);
    }
  }

  async function ensureProfile(u: SupaUser) {
    try {
      const { data } = await supabase().from("users").select("id").eq("id", u.id).single();
      if (!data) {
        const phone = u.user_metadata?.phone || null;
        const role = u.user_metadata?.role || 'member';
        const is_approved = u.user_metadata?.is_approved || false;
        
        await supabase().from("users").insert({ 
          id: u.id, 
          email: u.email, 
          role: role,
          phone: phone,
          is_approved: is_approved
        });
      }
    } catch (err) {
      console.warn("[AuthProvider] profile bootstrap skipped:", err);
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, isApproved, memberId, phone, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
