import { NextResponse } from "next/server";
import { createLicense, listLicenses } from "@/lib/api";
import { requireAuth } from "@/lib/require-auth";
import type { CreateLicenseBody } from "@/lib/types";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const licenses = await listLicenses();
    return NextResponse.json(licenses);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list licenses";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth();
  if (authError) return authError;

  let body: CreateLicenseBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.license_key?.trim()) {
    return NextResponse.json({ error: "License key is required" }, { status: 400 });
  }

  try {
    const result = await createLicense({
      license_key: body.license_key.trim(),
      product: body.product?.trim() || "default",
      notes: body.notes?.trim() || null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create license";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
