import { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

// One long-lived browser client that persists the session via cookies.
// Using createBrowserClient avoids the "Multiple GoTrueClient instances
// detected" warning: the client is created once and reused, with the
// auth session flowing through cookies (no new client needed after
// sign-in / sign-out, so invalidateSupabaseClient is a no-op on the web).
let _instance: SupabaseClient<any, "public"> | null = null;

function buildMockClient(): SupabaseClient<any, "public"> {
  const mockQuery: any = {
    select: () => mockQuery,
    order: () => mockQuery,
    eq: () => mockQuery,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return {
    from: () => ({
      select: () => mockQuery,
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => mockQuery,
      delete: () => mockQuery,
      eq: () => mockQuery,
    }),
    auth: {
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      signUp: () =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  } as unknown as SupabaseClient<any, "public">;
}

export const getSupabase = (): SupabaseClient<any, "public"> => {
  if (_instance) return _instance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Running in build/deploy environment without env vars — use mock client
    console.warn("Supabase env vars not set — using mock client");
    _instance = buildMockClient();
    return _instance;
  }

  _instance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return _instance;
};

/**
 * Invalidate the cached Supabase client.
 * Call this after sign-in / sign-up so the client re-reads fresh cookies.
 */
export const invalidateSupabaseClient = () => {
  _instance = null;
};

export type User = {
  id: string;
  email: string;
  role: "admin" | "treasurer" | "member";
};

export type Member = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  join_date: string;
  status: "active" | "inactive";
  user_id: string;
  created_at: string;
};

export type Donation = {
  id: string;
  member_id: string;
  amount: number;
  date: string;
  method: "cash" | "bkash" | "nagad" | "bank";
  receipt_no: string;
  received_by?: string;
  created_by?: string;
  created_at: string;
  members?: { name: string };
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  proof_url?: string;
  created_by?: string;
  created_at: string;
};
