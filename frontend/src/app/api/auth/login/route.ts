import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(request: Request) {
  let body: { adminKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const adminKey = body.adminKey?.trim();
  const expected = process.env.ADMIN_KEY;

  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfiguration: ADMIN_KEY not set" },
      { status: 500 }
    );
  }

  if (!adminKey || adminKey !== expected) {
    return NextResponse.json({ error: "Invalid admin key" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
  return response;
}
