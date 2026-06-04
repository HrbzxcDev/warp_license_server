"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  onCreated: () => void;
};

function generateLicenseKey() {
  const segment = () =>
    crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `WARP-${segment()}-${segment()}-${segment()}`;
}

export function CreateLicenseDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [product, setProduct] = useState("default");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          product: product.trim() || "default",
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to create license");
        return;
      }

      toast.success(data.message ?? "License created");
      setOpen(false);
      setLicenseKey("");
      setProduct("default");
      setNotes("");
      onCreated();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create license</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create license</DialogTitle>
            <DialogDescription>
              Add a new inactive license key to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="license_key">License key</Label>
              <div className="flex gap-2">
                <Input
                  id="license_key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="WARP-XXXX-XXXX-XXXX"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate key"
                  onClick={() => setLicenseKey(generateLicenseKey())}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product">Product</Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
