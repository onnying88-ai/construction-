"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import {
  previewMasterlist,
  importMasterlist,
  type PreviewResult,
  type ImportResult,
} from "@/lib/actions/masterlist";

export function ImportMasterlist() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [reading, startRead] = useTransition();
  const [importing, startImport] = useTransition();

  function handleRead(formData: FormData) {
    setResult(null);
    startRead(async () => {
      const res = await previewMasterlist(formData);
      if (res.error) {
        toast.error(res.error);
        setPreview(null);
        return;
      }
      setPreview(res);
      setMapping(Object.fromEntries((res.rows ?? []).map((r) => [r.code, r.suggestedProjectId ?? "new"])));
    });
  }

  function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("mapping", JSON.stringify(mapping));
    startImport(async () => {
      const res = await importMasterlist(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setResult(res);
      setPreview(null);
      toast.success("Masterlist imported");
    });
  }

  const rows = preview?.rows ?? [];
  const toImport = rows.filter((r) => mapping[r.code] !== "skip").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import REFIT masterlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload the <em>REFIT Project Master List P&amp;L</em> workbook. Each project becomes a project here with its
            quotations and VO claims (Quotations), Refit / VO / supplier costs (Costing), and client payments plus any
            outstanding balance (Invoices). You&apos;ll review everything before anything is saved, and re-importing the
            same file won&apos;t create duplicates.
          </p>
          <form action={handleRead} className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="file">Masterlist (.xlsx)</Label>
              <Input ref={fileRef} id="file" name="file" type="file" accept=".xlsx" required />
            </div>
            <Button type="submit" disabled={reading}>
              {reading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Reading...
                </>
              ) : (
                "Preview"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {preview?.warnings && preview.warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="space-y-1 pt-4 text-sm">
            {preview.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {preview && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review {rows.length} projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Where a project already exists in the app (for example one created from your folders), pick it under
              &ldquo;Add to&rdquo; so the records are merged instead of creating a duplicate. Amounts are excl. SST.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Add to</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.code}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.code} · {r.client}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(r.totals.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.totals.cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.totals.received)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.totals.outstanding)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {r.quotations} quotes · {r.costs} costs · {r.invoices} invoices
                      </TableCell>
                      <TableCell>
                        <select
                          aria-label={`Where to add ${r.name}`}
                          className="h-8 w-full min-w-44 rounded-lg border border-input bg-background px-2 text-sm"
                          value={mapping[r.code] ?? "new"}
                          onChange={(e) => setMapping((m) => ({ ...m, [r.code]: e.target.value }))}
                        >
                          <option value="new">New project</option>
                          <option value="skip">Skip this project</option>
                          <optgroup label="Existing project">
                            {preview.existing?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={handleImport} disabled={importing || toImport === 0}>
              {importing ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${toImport} project${toImport === 1 ? "" : "s"}`
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="space-y-1 pt-4 text-sm">
            <p className="font-medium">Import complete</p>
            <p>
              {result.projectsCreated} new project(s), {result.projectsMerged} merged into existing ·{" "}
              {result.quotations} quotations · {result.costs} cost entries · {result.invoices} invoices
              {result.skippedDuplicates ? ` · ${result.skippedDuplicates} already present (skipped)` : ""}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
