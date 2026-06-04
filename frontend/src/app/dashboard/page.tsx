import { AppHeader } from "@/components/app-header";
import { LicenseTable } from "@/components/license-table";
import { listLicenses } from "@/lib/api";
import type { License } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let licenses: License[] = [];
  let error: string | null = null;

  try {
    licenses = await listLicenses();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load licenses";
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">Could not reach the license API</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-red-700 dark:text-red-300">
              Ensure FastAPI is running at{" "}
              {process.env.API_BASE_URL ?? "http://localhost:8000"}.
            </p>
          </div>
        ) : (
          <LicenseTable initialLicenses={licenses} />
        )}
      </main>
    </div>
  );
}
