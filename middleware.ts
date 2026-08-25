import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";

export async function middleware(req: Request) {
  const res = NextResponse.next();
  const cookieStore = await nextCookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase credentials are not configured (e.g. local run without
  // .env.local or a deploy where env vars haven't been added yet), skip the
  // auth gate entirely so the app can still serve. The client-side Supabase
  // wrapper will fall back to a mock client in that case.
  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = new URL(req.url);
  // PWA assets must be publicly reachable (service worker, manifest, icons)
  const isPwaAsset =
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/icon") ||
    pathname === "/favicon.ico";
  const isPublic = 
    pathname === "/" || 
    pathname === "/login" || 
    pathname.startsWith("/login/") || 
    pathname === "/signup" || 
    pathname.startsWith("/signup/") || 
    isPwaAsset;

  if (!isPublic && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|api/).*)"],
};
