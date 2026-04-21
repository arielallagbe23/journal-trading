import { NextRequest, NextResponse } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/") && MUTATION_METHODS.has(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      const expectedHost = req.headers.get("host") ?? req.nextUrl.host;
      try {
        const originHost = new URL(origin).host;
        if (originHost !== expectedHost) {
          return NextResponse.json({ error: "CSRF_REJECTED" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "CSRF_REJECTED" }, { status: 403 });
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
