import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["ar", "en"],
  defaultLocale: "ar",
});

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  const response = intlResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const localeMatch = pathname.match(/^\/(ar|en)(\/|$)/);
  const locale = localeMatch?.[1] ?? "ar";

  const isLoginPage =
    pathname === `/${locale}/login` ||
    pathname === `/${locale}/login/`;

  const isRegisterPage =
    pathname === `/${locale}/register` ||
    pathname === `/${locale}/register/`;

  const isPublicPage = isLoginPage || isRegisterPage;

  if (!user && !isPublicPage) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = `/${locale}/login`;
    loginUrl.search = "";

    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPage) {
    const dashboardUrl = request.nextUrl.clone();

    dashboardUrl.pathname = `/${locale}`;
    dashboardUrl.search = "";

    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};