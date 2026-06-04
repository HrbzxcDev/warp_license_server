"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Invalid Admin Key");
        return;
      }

      toast.success("Signed In Successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
            <KeyRound className="h-6 w-6 text-indigo-600" />
          </div>
          <CardTitle>Warp License Admin</CardTitle>
          <CardDescription>
            Enter your admin key to manage licenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminKey">Admin key</Label>
              <Input
                id="adminKey"
                type="password"
                autoComplete="current-password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Your ADMIN_KEY"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing In…" : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
