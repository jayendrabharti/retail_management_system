import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = new URL(request.url).pathname;

  const protectedRoutes = [
    "/dashboard",
    "/parties",
    "/inventory",
    "/analytics",
    "/account_settings",
    "/settings",
  ];
  const authRoutes = ["/login", "/signup"];

  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
  const isAuthRoute = authRoutes.includes(path);

  const response = NextResponse.next();

  if (isProtectedRoute || isAuthRoute) {
    const user = await getUser(request, response);

    if (isProtectedRoute && !user) {
      return NextResponse.rewrite(new URL("/unauthorized", request.url));
    }

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
