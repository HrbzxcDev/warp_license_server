import { NextResponse } from "next/server";
import { SESSION_COOKIE, clearSessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(
    SESSION_COOKIE,
    "",
    clearSessionCookieOptions(request)
  );
  return response;
}
