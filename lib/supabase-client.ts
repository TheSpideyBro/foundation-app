import { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

// One long-lived browser client that persists the session via cookies.
// Using createBrowserClient avoids the "Multiple GoTrueClient instances
// detected" warning: the client is created once and reused, with the
// auth session flowing through cookies. Never invalidate this singleton on
// auth events — that spawns a second GoTrueClient next to the live listener.
let _instance: SupabaseClient<any, "public"> | null = null;

function buildMockClient(): SupabaseClient<any, "public"> {
  // Build-time / misconfigured fallback. Reads return empty results, but
  // WRITES FAIL LOUDLY: the previous mock resolved insert/update/delete with
  // success, so a build without NEXT_PUBLIC_SUPABASE_* let users "save"
  // payments, members and expenses that were never persisted.
  const notConfigured = {
    message: "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY missing)",
    code: "SUPABASE_NOT_CONFIGURED",
    details: "",
    hint: "",
  };
  const readOnlyQuery: any = {
    select: () => readOnlyQuery,
    order: () => readOnlyQuery,
    eq: () => readOnlyQuery,
    gte: () => readOnlyQuery,
    lte: () => readOnlyQuery,
    limit: () => readOnlyQuery,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  const writeRejected: any = {
    select: () => writeRejected,
    eq: () => writeRejected,
    single: () => Promise.resolve({ data: null, error: notConfigured }),
    maybeSingle: () => Promise.resolve({ data: null, error: notConfigured }),
    then: (resolve: any) => resolve({ data: null, error: notConfigured }),
  };
  return {
    from: () => ({
      select: () => readOnlyQuery,
      insert: () => Promise.resolve({ data: null, error: notConfigured }),
      update: () => writeRejected,
      upsert: () => Promise.resolve({ data: null, error: notConfigured }),
      delete: () => writeRejected,
      eq: () => writeRejected,
    }),
    rpc: () => Promise.resolve({ data: null, error: notConfigured }),
    auth: {
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null, session: null }, error: notConfigured }),
      signUp: () =>
        Promise.resolve({ data: { user: null, session: null }, error: notConfigured }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
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
