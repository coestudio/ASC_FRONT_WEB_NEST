import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { locales, defaultLocale } from "@/i18n/config";

const publicRoutes = ["/login", "/forgot-password"];

function getLocaleFromRequest(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const requested = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);

  for (const lang of requested) {
    const exact = locales.find((locale) => locale.toLowerCase() === lang);
    if (exact) return exact;

    const base = lang.split("-")[0];
    const partial = locales.find(
      (locale) => locale.toLowerCase().split("-")[0] === base
    );
    if (partial) return partial;
  }

  return defaultLocale;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const pathnameLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  // Sem locale na URL: detecta pelo Accept-Language e redireciona.
  if (!pathnameLocale) {
    const locale = getLocaleFromRequest(req);
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const pathWithoutLocale = pathname.slice(`/${pathnameLocale}`.length) || "/";
  const isLoggedIn = !!req.auth;
  const isPublicRoute = publicRoutes.some((route) =>
    pathWithoutLocale.startsWith(route)
  );

  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL(`/${pathnameLocale}/login`, req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    loginUrl.searchParams.set("toast", "expired");
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL(`/${pathnameLocale}`, req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$|favicon.ico).*)"],
};
