import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { licenses, type LicenseRow } from "@/db/schema";
import type { CreateLicenseBody, License, MessageResponse } from "@/lib/types";

function toLicense(row: LicenseRow): License {
  return {
    license_key: row.licenseKey,
    product: row.product,
    status: row.status,
    machine_id: row.machineId,
    activated_at: row.activatedAt,
    created_at: row.createdAt,
    notes: row.notes,
  };
}

export async function listLicenses(): Promise<License[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(licenses)
    .orderBy(desc(licenses.createdAt));
  return rows.map(toLicense);
}

export async function createLicense(
  body: CreateLicenseBody
): Promise<MessageResponse> {
  const db = getDb();
  const licenseKey = body.license_key.trim();
  const product = body.product?.trim() || "default";

  const existing = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(eq(licenses.licenseKey, licenseKey))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: "License key already exists." };
  }

  await db.insert(licenses).values({
    licenseKey,
    product,
    status: "inactive",
    notes: body.notes?.trim() || null,
  });

  return {
    success: true,
    message: "License key created.",
    data: { license_key: licenseKey },
  };
}

export async function revokeLicense(
  licenseKey: string
): Promise<MessageResponse> {
  const db = getDb();
  const key = licenseKey.trim();

  const existing = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(eq(licenses.licenseKey, key))
    .limit(1);

  if (existing.length === 0) {
    return { success: false, message: "License key not found." };
  }

  await db
    .update(licenses)
    .set({
      status: "inactive",
      machineId: null,
      activatedAt: null,
    })
    .where(eq(licenses.licenseKey, key));

  return {
    success: true,
    message: "License key revoked and reset to inactive.",
  };
}
