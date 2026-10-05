import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCostEntry, updateCostEntry, deleteCostEntry } from "@/lib/actions/cost";
import { AccessDenied } from "@/components/access-denied";
import { AmountCell } from "@/components/amount-cell";
import { CostFields } from "@/components/cost-fields";
import { RecordDialog } from "@/components/record-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { SummaryRow } from "@/components/summary-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COST_TYPE, PROJECT_STATUS } from "@/lib/status";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { PencilIcon, PlusIcon } from "lucide-react";

const COLUMNS = 8;
const n = (v: unknown) => Number(v);

export default async function SummaryPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return <AccessDenied module="The financial summary" />;

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: {
      quotations: true,
      invoices: true,
      costEntries: { orderBy: { date: "desc" } },
    },
  });

  const rows = projects.map((p) => {
    // Same basis as each project's P&L tab: revenue excludes SST (it's owed to the
    // tax authority); cost includes any SST paid on purchases.
    const revenue = p.quotations.filter((q) => q.status === "ACCEPTED").reduce((s, q) => s + n(q.amount), 0);
    const pending = p.quotations.filter((q) => q.status === "SENT" || q.status === "DRAFT").reduce((s, q) => s + n(q.amount), 0);
    const cost = p.costEntries.filter((c) => c.type === "ACTUAL").reduce((s, c) => s + n(c.amount) + n(c.taxAmount), 0);
    const billed = p.invoices.reduce((s, i) => s + n(i.amount) + n(i.taxAmount), 0);
    const received = p.invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + n(i.amount) + n(i.taxAmount), 0);
    const outstanding = billed - received;
    const profit = revenue - cost;
    return { p, revenue, pending, cost, profit, margin: revenue > 0 ? (profit / revenue) * 100 : null, billed, received, outstanding };
  });

  const total = rows.reduce(
    (t, r) => ({
      revenue: t.revenue + r.revenue,
      cost: t.cost + r.cost,
      profit: t.profit + r.profit,
      billed: t.billed + r.billed,
      received: t.received + r.received,
      outstanding: t.outstanding + r.outstanding,
    }),
    { revenue: 0, cost: 0, profit: 0, billed: 0, received: 0, outstanding: 0 }
  );
  const totalMargin = total.revenue > 0 ? (total.profit / total.revenue) * 100 : null;
  const noCost = rows.filter((r) => r.revenue > 0 && r.cost === 0).length;

  const stat = (label: string, value: string, tone?: string) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className={`text-xl font-semibold ${tone ?? ""}`}>{value}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Financial Summary</h1>
        <p className="text-sm text-muted-foreground">
          Revenue = accepted quotations excl. SST. Cost = actual costs incl. SST paid. Outstanding = invoices not yet
          paid. Click a project to add, edit or delete its costs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Total Revenue", formatCurrency(total.revenue))}
        {stat("Total Cost", formatCurrency(total.cost))}
        {stat("Gross Profit", `${formatCurrency(total.profit)}${totalMargin === null ? "" : ` · ${formatPercent(totalMargin)}`}`, total.profit < 0 ? "text-red-600" : "text-green-600")}
        {stat("Total Outstanding", formatCurrency(total.outstanding), total.outstanding > 0 ? "text-amber-600" : "")}
      </div>

      {noCost > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          {noCost} project{noCost === 1 ? " has" : "s have"} revenue but no cost entered yet, so the profit shown for{" "}
          {noCost === 1 ? "it is" : "them is"} too high. Open the row and use <strong>Add cost</strong>.
        </p>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ p, revenue, pending, cost, profit, margin, billed, received, outstanding }) => (
              <SummaryRow
                key={p.id}
                columns={COLUMNS}
                name={
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="mt-0.5 block">
                      <StatusBadge map={PROJECT_STATUS} status={p.status} />
                      {revenue > 0 && cost === 0 && (
                        <Badge variant="outline" className="ml-1 border-amber-300 text-amber-700">
                          No cost yet
                        </Badge>
                      )}
                    </span>
                  </span>
                }
                cells={
                  <>
                    <TableCell className="text-right">
                      {formatCurrency(revenue)}
                      {pending > 0 && (
                        <span className="block text-xs text-muted-foreground">+ {formatCurrency(pending)} quoted, not accepted</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                    <TableCell className={`text-right ${profit < 0 ? "text-red-600" : ""}`}>{formatCurrency(profit)}</TableCell>
                    <TableCell className="text-right">{formatPercent(margin)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(billed)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(received)}</TableCell>
                    <TableCell className={`text-right ${outstanding > 0 ? "font-medium text-amber-600" : ""}`}>
                      {formatCurrency(outstanding)}
                    </TableCell>
                  </>
                }
                detail={
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">Costs — {p.name}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" render={<Link href={`/projects/${p.id}/costing`} />} nativeButton={false}>
                          Open Costing tab
                        </Button>
                        <RecordDialog
                          title={`Add cost — ${p.name}`}
                          action={createCostEntry.bind(null, p.id)}
                          trigger={
                            <Button size="sm">
                              <PlusIcon className="size-4" />
                              Add cost
                            </Button>
                          }
                        >
                          <CostFields defaultType="ACTUAL" />
                        </RecordDialog>
                      </div>
                    </div>
                    {p.costEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No cost entries yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="w-32" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {p.costEntries.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <StatusBadge map={COST_TYPE} status={c.type} />
                              </TableCell>
                              <TableCell className="font-medium">{c.category}</TableCell>
                              <TableCell className="max-w-64 truncate text-muted-foreground">{c.description}</TableCell>
                              <TableCell>
                                <AmountCell amount={c.amount} taxAmount={c.taxAmount} />
                              </TableCell>
                              <TableCell>{formatDate(c.date)}</TableCell>
                              <TableCell className="flex items-center gap-1">
                                <RecordDialog
                                  title="Edit Cost Entry"
                                  action={updateCostEntry.bind(null, c.id, p.id)}
                                  trigger={
                                    <Button variant="ghost" size="icon-sm">
                                      <PencilIcon className="size-4" />
                                    </Button>
                                  }
                                >
                                  <CostFields item={c} />
                                </RecordDialog>
                                <form action={deleteCostEntry.bind(null, c.id, p.id)}>
                                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this cost entry?">
                                    Delete
                                  </ConfirmSubmitButton>
                                </form>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                }
              />
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="text-center text-muted-foreground">
                  No projects yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total ({rows.length} projects)</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(total.revenue)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(total.cost)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(total.profit)}</TableCell>
              <TableCell className="text-right font-semibold">{formatPercent(totalMargin)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(total.billed)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(total.received)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(total.outstanding)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
