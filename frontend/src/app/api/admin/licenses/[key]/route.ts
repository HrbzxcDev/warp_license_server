import { NextResponse } from "next/server";
import { revokeLicense } from "@/lib/api";
import { requireAuth } from "@/lib/require-auth";

type RouteContext = { params: Promise<{ key: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { key } = await context.params;
  const licenseKey = decodeURIComponent(key);

  try {
    const result = await revokeLicense(licenseKey);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke license";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
