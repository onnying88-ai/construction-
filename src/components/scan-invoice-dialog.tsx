"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { ScanLineIcon, Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scanInvoice, type ScanResult } from "@/lib/actions/scan";
import { createCostEntry, attachScannedPhoto } from "@/lib/actions/cost";

export function ScanInvoiceDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [scanning, startScan] = useTransition();
  const [saving, startSave] = useTransition();
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleScan(formData: FormData) {
    startScan(async () => {
      try {
        const scanResult = await scanInvoice(projectId, formData);
        setResult(scanResult);
        if (scanResult.guessedAmount === null) {
          toast.warning("Couldn't confidently read the amount — please check it.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Scan failed");
      }
    });
  }

  function handleSave(formData: FormData) {
    if (!result) return;
    startSave(async () => {
      try {
        const entryId = await createCostEntry(projectId, formData);
        await attachScannedPhoto(entryId, projectId, result.photoUrl, result.photoFileName);
        toast.success("Cost entry created from scanned invoice");
        setOpen(false);
        reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save cost entry");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <ScanLineIcon className="size-4" />
            Scan Invoice
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Invoice</DialogTitle>
        </DialogHeader>

        {!result ? (
          <form action={handleScan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo">Photo of invoice / receipt</Label>
              <Input ref={fileInputRef} id="photo" name="photo" type="file" accept="image/*" required />
              <p className="text-xs text-muted-foreground">
                JPG or PNG. Text is read locally on the server — no third-party AI service is used.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={scanning}>
                {scanning ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Reading invoice...
                  </>
                ) : (
                  "Scan"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form action={handleSave} className="space-y-4">
            <div className="rounded-lg border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.photoUrl} alt="Scanned invoice" className="max-h-40 rounded object-contain" />
            </div>

            <p className="text-xs text-muted-foreground">
              Review the details below — OCR reading isn&apos;t always perfect, so double-check the
              amount and date before saving.
            </p>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={result.guessedCategory} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} placeholder="Optional notes" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue="ACTUAL">
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUDGET">Budget</SelectItem>
                    <SelectItem value="ACTUAL">Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (RM)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={result.guessedAmount ?? ""}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxAmount">Tax / SST (RM)</Label>
              <Input
                id="taxAmount"
                name="taxAmount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={result.guessedTax ?? ""}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={result.guessedDate ?? new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Raw scanned text</summary>
              <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-muted p-2">
                {result.rawText || "(no text detected)"}
              </pre>
            </details>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset} disabled={saving}>
                Scan a different photo
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Cost Entry"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
