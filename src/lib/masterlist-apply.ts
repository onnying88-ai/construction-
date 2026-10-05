import { prisma } from "@/lib/prisma";
import type { MasterlistPlan } from "@/lib/masterlist-import";

export type ApplyResult = {
  projectsCreated: number;
  projectsMerged: number;
  quotations: number;
  costs: number;
  invoices: number;
  skippedDuplicates: number;
};

const toDate = (d: string | null) => (d ? new Date(`${d}T00:00:00.000Z`) : null);
const costKey = (c: { type: string; category: string; description: string | null; amount: unknown }) =>
  `${c.type}|${c.category}|${c.description ?? ""}|${Number(c.amount).toFixed(2)}`;

/** mapping: { [projectCode]: "new" | existingProjectId | "skip" } */
export async function applyMasterlist(plan: MasterlistPlan, mapping: Record<string, string>): Promise<ApplyResult> {
  const result: ApplyResult = {
    projectsCreated: 0,
    projectsMerged: 0,
    quotations: 0,
    costs: 0,
    invoices: 0,
    skippedDuplicates: 0,
  };

  for (const p of plan.projects) {
    const target = mapping[p.code] ?? "new";
    if (target === "skip") continue;

    await prisma.$transaction(async (tx) => {
      let projectId: string | null = null;
      if (target !== "new") {
        const chosen = await tx.project.findUnique({ where: { id: target }, select: { id: true, notes: true } });
        if (!chosen) throw new Error(`Project chosen for ${p.code} no longer exists.`);
        projectId = chosen.id;
        if (!chosen.notes?.includes(`Code: ${p.code}`)) {
          await tx.project.update({
            where: { id: chosen.id },
            data: { notes: [chosen.notes, p.notes].filter(Boolean).join("\n\n") },
          });
        }
        result.projectsMerged++;
      } else {
        const earlier = await tx.project.findFirst({ where: { notes: { startsWith: `Code: ${p.code}` } }, select: { id: true } });
        if (earlier) {
          projectId = earlier.id;
          result.projectsMerged++;
        } else {
          const created = await tx.project.create({
            data: { name: p.name, location: p.location, status: p.status, notes: p.notes },
            select: { id: true },
          });
          projectId = created.id;
          result.projectsCreated++;
        }
      }

      const [quotes, invoices, costs] = await Promise.all([
        tx.quotation.findMany({ where: { projectId }, select: { quotationNo: true } }),
        tx.invoice.findMany({ where: { projectId }, select: { invoiceNo: true } }),
        tx.costEntry.findMany({ where: { projectId } }),
      ]);

      const haveQuote = new Set(quotes.map((q) => q.quotationNo));
      for (const q of p.quotations) {
        if (haveQuote.has(q.quotationNo)) {
          result.skippedDuplicates++;
          continue;
        }
        await tx.quotation.create({
          data: {
            projectId,
            quotationNo: q.quotationNo,
            title: q.title,
            amount: q.amount,
            taxAmount: q.taxAmount,
            status: q.status,
            issueDate: toDate(q.issueDate),
          },
        });
        result.quotations++;
      }

      const haveInvoice = new Set(invoices.map((i) => i.invoiceNo));
      for (const i of p.invoices) {
        if (haveInvoice.has(i.invoiceNo)) {
          result.skippedDuplicates++;
          continue;
        }
        await tx.invoice.create({
          data: {
            projectId,
            invoiceNo: i.invoiceNo,
            amount: i.amount,
            taxAmount: i.taxAmount,
            status: i.status,
            issueDate: toDate(i.issueDate),
            paidDate: toDate(i.paidDate),
          },
        });
        result.invoices++;
      }

      // Identical cost lines are legitimate (same supplier, same amount, twice), so
      // compare as a multiset: only create the ones beyond what already exists.
      const existingCount = new Map<string, number>();
      for (const c of costs) existingCount.set(costKey(c), (existingCount.get(costKey(c)) ?? 0) + 1);
      const seen = new Map<string, number>();
      for (const c of p.costs) {
        const k = costKey(c);
        const n = (seen.get(k) ?? 0) + 1;
        seen.set(k, n);
        if (n <= (existingCount.get(k) ?? 0)) {
          result.skippedDuplicates++;
          continue;
        }
        await tx.costEntry.create({
          data: {
            projectId,
            category: c.category,
            description: c.description,
            type: c.type,
            amount: c.amount,
            taxAmount: c.taxAmount,
            date: toDate(c.date)!,
          },
        });
        result.costs++;
      }
    });
  }

  return result;
}
