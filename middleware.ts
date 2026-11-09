import { auth } from "@/auth";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isDashboardOrAdmin =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (!req.auth && isDashboardOrAdmin) {
    const signInUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }

  if (pathname.startsWith("/admin")) {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

