"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase as supabase } from "@/lib/supabase-client";
import type { User as SupaUser } from "@supabase/supabase-js";

type AuthContextType = {
  user: SupaUser | null | undefined;
  role: string | null;
  isApproved: boolean;
  memberId: string | null;
  phone: string | null;
  loading: boolean;
  /** Set when the users-row bootstrap/lookup itself failed (not "unapproved"). */
  profileError: string | null;
  /** Re-reads the caller's public.users row (retry after a failed bootstrap). */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  role: null,
  isApproved: false,
  memberId: null,
  phone: null,
  loading: true,
  profileError: null,
  refreshProfile: async () => {},
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
  const [profileError, setProfileError] = useState<string | null>(null);

  async function resolveRole(uid: string) {
    try {
      const { data, error } = await supabase()
        .from("users")
        .select("role, is_approved, member_id, phone")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // No row: the bootstrap insert must have failed earlier. Surface it
        // instead of silently rendering "awaiting approval" forever.
        setRole(null);
        setIsApproved(false);
        setMemberId(null);
        setPhone(null);
        setProfileError("প্রোফাইল তৈরি হয়নি");
        return;
      }

      setProfileError(null);
      setRole(data.role);
      setIsApproved(data.is_approved);
      setMemberId(data.member_id);
      setPhone(data.phone);
    } catch (err) {
      console.error("[AuthProvider] resolveRole failed:", err);
      setProfileError(err instanceof Error ? err.message : "প্রোফাইল লোড করতে সমস্যা হয়েছে");
    }
  }

  async function ensureProfile(u: SupaUser) {
    try {
      const { data, error } = await supabase()
        .from("users")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return;

      // role / is_approved are hard-coded on purpose. They used to be read
      // from u.user_metadata, which the client itself supplies at signUp —
      // anyone could register with { role: 'admin', is_approved: true }.
      // Only an admin may grant a role (public.users updates, RLS-guarded).
      const { error: insertError } = await supabase().from("users").insert({
        id: u.id,
        email: u.email,
        role: "member",
        phone: u.user_metadata?.phone || null,
        is_approved: false,
      });
      if (insertError) throw insertError;
    } catch (err) {
      console.warn("[AuthProvider] profile bootstrap failed:", err);
      setProfileError(err instanceof Error ? err.message : "প্রোফাইল তৈরি করতে সমস্যা হয়েছে");
    }
  }

  const refreshProfile = async () => {
    const current = supabase().auth.getUser();
    const {
      data: { user },
    } = await current;
    if (user) {
      await ensureProfile(user);
      await resolveRole(user.id);
    }
  };

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
        setProfileError(err instanceof Error ? err.message : "লগইন স্টেট লোড করতে সমস্যা হয়েছে");
        setLoading(false);
      });

    // One long-lived client for the whole app: do NOT invalidate the
    // singleton here. Tossing it on every auth event builds a second
    // GoTrueClient alongside this live listener (duplicated auth state).
    const { data: authListener } = supabase().auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user as SupaUser);
        await resolveRole((session.user as SupaUser).id);
      } else {
        setUser(null);
        setRole(null);
        setIsApproved(false);
        setMemberId(null);
        setPhone(null);
        setProfileError(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase().auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, role, isApproved, memberId, phone, loading, profileError, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
