import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-auth";

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isDashboardOrAdmin =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isDashboardOrAdmin) {
    if (!req.auth?.user?.email) {
      return Response.redirect(new URL("/login", req.nextUrl.origin));
    }

    if (!isAdminEmail(req.auth.user.email)) {
      return Response.redirect(
        new URL("/login?error=AccessDenied", req.nextUrl.origin),
      );
    }
  }

  if (pathname.startsWith("/admin")) {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

