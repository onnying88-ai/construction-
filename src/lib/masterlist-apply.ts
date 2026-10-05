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

/**
 * mapping: { [projectCode]: "new" | existingProjectId | "skip" }
 *
 * Deliberately NOT one big interactive transaction: against a hosted database
 * (Neon) a project with ~15 cost lines exceeds Prisma's 5 s transaction limit
 * ("Transaction not found"). Instead each project's records go in with a few
 * bulk createMany calls, and the whole thing is safe to re-run — anything
 * already present is detected and skipped, so a half-finished run just resumes.
 */
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

    let projectId: string;
    if (target !== "new") {
      const chosen = await prisma.project.findUnique({ where: { id: target }, select: { id: true, notes: true } });
      if (!chosen) throw new Error(`Project chosen for ${p.code} no longer exists.`);
      projectId = chosen.id;
      if (!chosen.notes?.includes(`Code: ${p.code}`)) {
        await prisma.project.update({
          where: { id: chosen.id },
          data: { notes: [chosen.notes, p.notes].filter(Boolean).join("\n\n") },
        });
      }
      result.projectsMerged++;
    } else {
      const earlier = await prisma.project.findFirst({
        where: { notes: { startsWith: `Code: ${p.code}` } },
        select: { id: true },
      });
      if (earlier) {
        projectId = earlier.id;
        result.projectsMerged++;
      } else {
        const created = await prisma.project.create({
          data: { name: p.name, location: p.location, status: p.status, notes: p.notes },
          select: { id: true },
        });
        projectId = created.id;
        result.projectsCreated++;
      }
    }

    const [quotes, invoices, costs] = await Promise.all([
      prisma.quotation.findMany({ where: { projectId }, select: { quotationNo: true } }),
      prisma.invoice.findMany({ where: { projectId }, select: { invoiceNo: true } }),
      prisma.costEntry.findMany({ where: { projectId } }),
    ]);

    const haveQuote = new Set(quotes.map((q) => q.quotationNo));
    const newQuotes = p.quotations.filter((q) => !haveQuote.has(q.quotationNo));

    const haveInvoice = new Set(invoices.map((i) => i.invoiceNo));
    const newInvoices = p.invoices.filter((i) => !haveInvoice.has(i.invoiceNo));

    // Identical cost lines are legitimate (same supplier, same amount, twice), so
    // compare as a multiset: only create the ones beyond what already exists.
    const existingCount = new Map<string, number>();
    for (const c of costs) existingCount.set(costKey(c), (existingCount.get(costKey(c)) ?? 0) + 1);
    const seen = new Map<string, number>();
    const newCosts = p.costs.filter((c) => {
      const k = costKey(c);
      const n = (seen.get(k) ?? 0) + 1;
      seen.set(k, n);
      return n > (existingCount.get(k) ?? 0);
    });

    await Promise.all([
      newQuotes.length &&
        prisma.quotation.createMany({
          data: newQuotes.map((q) => ({
            projectId,
            quotationNo: q.quotationNo,
            title: q.title,
            amount: q.amount,
            taxAmount: q.taxAmount,
            status: q.status,
            issueDate: toDate(q.issueDate),
          })),
        }),
      newInvoices.length &&
        prisma.invoice.createMany({
          data: newInvoices.map((i) => ({
            projectId,
            invoiceNo: i.invoiceNo,
            amount: i.amount,
            taxAmount: i.taxAmount,
            status: i.status,
            issueDate: toDate(i.issueDate),
            paidDate: toDate(i.paidDate),
          })),
        }),
      newCosts.length &&
        prisma.costEntry.createMany({
          data: newCosts.map((c) => ({
            projectId,
            category: c.category,
            description: c.description,
            type: c.type,
            amount: c.amount,
            taxAmount: c.taxAmount,
            date: toDate(c.date)!,
          })),
        }),
    ]);

    result.quotations += newQuotes.length;
    result.invoices += newInvoices.length;
    result.costs += newCosts.length;
    result.skippedDuplicates +=
      p.quotations.length - newQuotes.length + (p.invoices.length - newInvoices.length) + (p.costs.length - newCosts.length);
  }

  return result;
}
