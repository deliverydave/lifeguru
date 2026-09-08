import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1";

const isPublicRoute = createRouteMatcher(["/", "/setup(.*)", "/sign-in(.*)", "/sign-up(.*)"]);

export default function middleware(req, event) {
  if (!clerkKey) {
    if (bypass) return NextResponse.next();
    const path = req.nextUrl.pathname;
    if (
      path === "/" ||
      path.startsWith("/setup") ||
      path.startsWith("/sign-in") ||
      path.startsWith("/sign-up")
    ) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }
  return clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  })(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
