import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AccessDenied } from "@/components/access-denied";
import { StatusBadge } from "@/components/status-badge";
import { QUOTATION_STATUS, INVOICE_STATUS } from "@/lib/status";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PnlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return <AccessDenied module="P&L" />;
  }

  const [quotations, invoices, actualCosts] = await Promise.all([
    prisma.quotation.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.invoice.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
    prisma.costEntry.findMany({
      where: { projectId, type: "ACTUAL" },
      orderBy: { category: "asc" },
    }),
  ]);

  const acceptedQuotations = quotations.filter((q) => q.status === "ACCEPTED");
  const acceptedQuoteTotal = acceptedQuotations.reduce((sum, q) => sum + Number(q.amount), 0);
  const invoicedTotal = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const actualCostTotal = actualCosts.reduce((sum, c) => sum + Number(c.amount), 0);

  const profitVsInvoiced = invoicedTotal - actualCostTotal;
  const marginVsInvoiced = invoicedTotal > 0 ? (profitVsInvoiced / invoicedTotal) * 100 : null;
  const profitVsQuote = acceptedQuoteTotal - actualCostTotal;
  const marginVsQuote = acceptedQuoteTotal > 0 ? (profitVsQuote / acceptedQuoteTotal) * 100 : null;

  const costByCategory = new Map<string, number>();
  for (const c of actualCosts) {
    costByCategory.set(c.category, (costByCategory.get(c.category) ?? 0) + Number(c.amount));
  }
  const costRows = Array.from(costByCategory.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Accepted Quotes" value={formatCurrency(acceptedQuoteTotal)} />
        <SummaryCard label="Total Invoiced" value={formatCurrency(invoicedTotal)} />
        <SummaryCard label="Total Actual Cost" value={formatCurrency(actualCostTotal)} />
        <SummaryCard
          label="Net Profit (vs Invoiced)"
          value={formatCurrency(profitVsInvoiced)}
          tone={profitVsInvoiced >= 0 ? "positive" : "negative"}
          sub={`Margin ${formatPercent(marginVsInvoiced)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit &amp; Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Revenue — Total Invoiced</TableCell>
                <TableCell className="text-right">{formatCurrency(invoicedTotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6 text-sm text-muted-foreground">
                  Memo: Accepted quotation value
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatCurrency(acceptedQuoteTotal)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Less: Actual Costs</TableCell>
                <TableCell className="text-right">({formatCurrency(actualCostTotal)})</TableCell>
              </TableRow>
              {costRows.map((row) => (
                <TableRow key={row.category}>
                  <TableCell className="pl-6 text-sm text-muted-foreground">{row.category}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    ({formatCurrency(row.amount)})
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell className="font-semibold">Net Profit (vs Invoiced)</TableCell>
                <TableCell
                  className={`text-right font-semibold ${profitVsInvoiced >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(profitVsInvoiced)} ({formatPercent(marginVsInvoiced)})
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-sm text-muted-foreground">
                  Net Profit (vs Accepted Quote)
                </TableCell>
                <TableCell
                  className={`text-right text-sm ${profitVsQuote >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(profitVsQuote)} ({formatPercent(marginVsQuote)})
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.invoiceNo}</TableCell>
                    <TableCell>
                      <StatusBadge map={INVOICE_STATUS} status={i.status} />
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(i.amount.toString())}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.quotationNo}</TableCell>
                    <TableCell>
                      <StatusBadge map={QUOTATION_STATUS} status={q.status} />
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(q.amount.toString())}</TableCell>
                  </TableRow>
                ))}
                {quotations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No quotations yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-xl font-semibold ${
            tone === "positive" ? "text-green-600" : tone === "negative" ? "text-red-600" : ""
          }`}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
