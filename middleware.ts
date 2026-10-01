import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";

export async function middleware(req: Request) {
  const res = NextResponse.next();
  const cookieStore = await nextCookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail closed: when Supabase credentials are missing we cannot verify a
  // session, so treat every request as unauthenticated. Protected routes
  // redirect to /login; public paths below stay public. (Previously the
  // gate was skipped entirely, which exposed every page.)
  const supabase =
    supabaseUrl && supabaseAnonKey
      ? createServerClient(supabaseUrl, supabaseAnonKey, {
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
        })
      : null;

  const session = supabase
    ? (await supabase.auth.getSession()).data.session
    : null;

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
    pathname === "/verify" ||
    pathname.startsWith("/verify/") ||
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
