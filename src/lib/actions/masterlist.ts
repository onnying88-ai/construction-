"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/helpers";
import { parseMasterlist, suggestMatch, type MasterlistPlan, type ProjectPlan } from "@/lib/masterlist-import";
import { applyMasterlist } from "@/lib/masterlist-apply";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 5 * 1024 * 1024;

export type PreviewRow = {
  code: string;
  name: string;
  client: string;
  status: string;
  quotations: number;
  costs: number;
  invoices: number;
  totals: ProjectPlan["totals"];
  suggestedProjectId: string | null;
};

export type PreviewResult = {
  error?: string;
  rows?: PreviewRow[];
  existing?: { id: string; name: string }[];
  warnings?: string[];
};

export type ImportResult = {
  error?: string;
  projectsCreated?: number;
  projectsMerged?: number;
  quotations?: number;
  costs?: number;
  invoices?: number;
  skippedDuplicates?: number;
};

async function readPlan(formData: FormData): Promise<MasterlistPlan> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose the masterlist .xlsx file first.");
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 5 MB).");
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Please upload an .xlsx file.");
  return parseMasterlist(await file.arrayBuffer());
}

export async function previewMasterlist(formData: FormData): Promise<PreviewResult> {
  await requireAdmin();
  try {
    const plan = await readPlan(formData);
    const existing = await prisma.project.findMany({
      select: { id: true, name: true, notes: true },
      orderBy: { name: "asc" },
    });
    return {
      rows: plan.projects.map((p) => ({
        code: p.code,
        name: p.name,
        client: p.client,
        status: p.status,
        quotations: p.quotations.length,
        costs: p.costs.length,
        invoices: p.invoices.length,
        totals: p.totals,
        suggestedProjectId: suggestMatch(p, existing),
      })),
      existing: existing.map((e) => ({ id: e.id, name: e.name })),
      warnings: plan.warnings,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't read the file" };
  }
}

/**
 * `mapping` is a JSON object { [projectCode]: "new" | existingProjectId | "skip" }.
 * Safe to run twice: records already in the app (same quotation / invoice number,
 * or an identical cost line) are skipped, and projects imported before are
 * found again by their "Code: XXX" note.
 */
export async function importMasterlist(formData: FormData): Promise<ImportResult> {
  await requireAdmin();
  try {
    const plan = await readPlan(formData);
    const mapping = JSON.parse(String(formData.get("mapping") ?? "{}")) as Record<string, string>;
    const result = await applyMasterlist(plan, mapping);
    revalidatePath("/");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Import failed" };
  }
}
