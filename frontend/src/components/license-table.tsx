"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { License } from "@/lib/types";
import { formatDate } from "@/lib/format-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreateLicenseDialog } from "@/components/create-license-dialog";

type Props = {
  initialLicenses: License[];
};

export function LicenseTable({ initialLicenses }: Props) {
  const [licenses, setLicenses] = useState(initialLicenses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [revoking, setRevoking] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return licenses.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.license_key.toLowerCase().includes(q) ||
        row.product.toLowerCase().includes(q) ||
        (row.machine_id?.toLowerCase().includes(q) ?? false) ||
        (row.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [licenses, search, statusFilter]);

  const stats = useMemo(() => {
    const active = licenses.filter((l) => l.status === "active").length;
    return { total: licenses.length, active, inactive: licenses.length - active };
  }, [licenses]);

  async function refresh() {
    const res = await fetch("/api/admin/licenses");
    if (!res.ok) {
      toast.error("Failed to refresh licenses");
      return;
    }
    setLicenses(await res.json());
  }

  async function handleRevoke(licenseKey: string) {
    setRevoking(licenseKey);
    try {
      const res = await fetch(
        `/api/admin/licenses/${encodeURIComponent(licenseKey)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to revoke");
        return;
      }
      toast.success(data.message ?? "License revoked");
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 text-foreground/80">
        <StatCard label="Total keys" value={stats.total} />
        <StatCard label="Active" value={stats.active} accent="success" />
        <StatCard label="Inactive" value={stats.inactive} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              placeholder="Search keys, product, machine…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-md border p-2 border-zinc-200 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <CreateLicenseDialog onCreated={refresh} />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground/70">License key</TableHead>
              <TableHead className="text-foreground/70">Product</TableHead>
              <TableHead className="text-foreground/70">Status</TableHead>
              <TableHead className="text-foreground/70">Machine ID</TableHead>
              <TableHead className="text-foreground/70">Activated</TableHead>
              <TableHead className="text-foreground/70">Created</TableHead>
              <TableHead className="text-foreground/70">Notes</TableHead>
              <TableHead className="text-foreground/70 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-zinc-500">
                  No licenses found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.license_key}>
                  <TableCell className="font-mono text-xs">
                    {row.license_key}
                  </TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "active" ? "success" : "secondary"}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate font-mono text-xs">
                    {row.machine_id ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(row.activated_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(row.created_at)}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-xs">
                    {row.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            row.status !== "active" || revoking === row.license_key
                          }
                          title="Revoke license"
                        >
                        
                          {/* <Ban className="h-4 w-4 text-red-600" /> */}
                          <span className="text-red-500 text-xs">Revoke</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke license?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This resets <strong>{row.license_key}</strong> to
                            inactive and clears machine binding. The key can be
                            activated again on a new machine.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleRevoke(row.license_key)}
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-foreground/80">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          accent === "success" ? "text-emerald-600" : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
