import type { CreateLicenseBody, License, MessageResponse } from "@/lib/types";

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

function adminHeaders(): HeadersInit {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    throw new Error("ADMIN_KEY is not configured");
  }
  return {
    "Content-Type": "application/json",
    "X-Admin-Key": adminKey,
  };
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid API response: ${text.slice(0, 200)}`);
  }
}

export async function listLicenses(): Promise<License[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/list-keys`, {
    headers: adminHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Failed to list licenses (${res.status})`);
  }

  return parseResponse<License[]>(res);
}

export async function createLicense(
  body: CreateLicenseBody
): Promise<MessageResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/create-key`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });

  return parseResponse<MessageResponse>(res);
}

export async function revokeLicense(
  licenseKey: string
): Promise<MessageResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/admin/revoke-key/${encodeURIComponent(licenseKey)}`,
    {
      method: "DELETE",
      headers: adminHeaders(),
    }
  );

  return parseResponse<MessageResponse>(res);
}
