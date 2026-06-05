import { AppHeader } from "@/components/app-header";
import { LicenseTable } from "@/components/license-table";
import { listLicenses } from "@/db/licenses";
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
            <p className="font-medium">Could not connect to the database</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-red-700 dark:text-red-300">
              Set <code className="text-xs">DATABASE_URL</code> in{" "}
              <code className="text-xs">frontend/.env.local</code> and run{" "}
              <code className="text-xs">npm run db:migrate</code>.
            </p>
          </div>
        ) : (
          <LicenseTable initialLicenses={licenses} />
        )}
      </main>
    </div>
  );
}
