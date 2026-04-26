import { NextResponse } from "next/server";

export function middleware(req: any) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const auth = req.headers.get("authorization");

    if (auth !== "admin123") {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  return NextResponse.next();
}