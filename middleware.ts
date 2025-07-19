import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware for route protection and authentication handling
 * - Protects main application routes from unauthenticated access
 * - Redirects authenticated users away from auth pages
 * - Uses Supabase Auth for session management
 */
export async function middleware(request: NextRequest) {
  const path = new URL(request.url).pathname;

  // Define routes that require authentication
  const protectedRoutes = [
    "/dashboard",
    "/parties",
    "/inventory",
    "/analytics",
    "/account_settings",
    "/settings",
  ];

  // Define authentication-related routes (login/signup)
  const authRoutes = ["/login", "/signup"];

  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
  const isAuthRoute = authRoutes.includes(path);

  const response = NextResponse.next();

  // Only run auth checks on protected or auth routes for performance
  if (isProtectedRoute || isAuthRoute) {
    const user = await getUser(request, response);

    // Redirect unauthenticated users trying to access protected routes
    if (isProtectedRoute && !user) {
      return NextResponse.rewrite(new URL("/unauthorized", request.url));
    }

    // Redirect authenticated users away from login/signup pages
    if (isAuthRoute && user) {
      return NextResponse.rewrite(new URL("/authorized", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

/**
 * Helper function to extract user session from Supabase cookies
 * Creates a server-side Supabase client and retrieves the authenticated user
 */
async function getUser(request: NextRequest, response: NextResponse) {
  const supabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  const { data } = await supabaseClient.auth.getUser();
  return data.user;
}
