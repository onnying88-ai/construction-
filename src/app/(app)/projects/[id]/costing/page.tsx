import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCostEntry, updateCostEntry, deleteCostEntry } from "@/lib/actions/cost";
import { createQuotation, updateQuotation, deleteQuotation } from "@/lib/actions/quotations";
import { StatusBadge } from "@/components/status-badge";
import { COST_TYPE, QUOTATION_STATUS } from "@/lib/status";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { RecordDialog } from "@/components/record-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ScanInvoiceDialog } from "@/components/scan-invoice-dialog";
import { AttachmentsDialog } from "@/components/attachments-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, PencilIcon } from "lucide-react";
import type { CostEntry, Quotation, Attachment } from "@prisma/client";

export const maxDuration = 60;

function CostFields({ item }: { item?: CostEntry }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" defaultValue={item?.category} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue={item?.type ?? "BUDGET"}>
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
          <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={item?.amount?.toString()} required />
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
          defaultValue={item?.taxAmount?.toString() ?? ""}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={toDateInputValue(item?.date) || undefined} required />
      </div>
    </>
  );
}

function QuotationFields({ item }: { item?: Quotation }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="quotationNo">Quotation No.</Label>
        <Input id="quotationNo" name="quotationNo" defaultValue={item?.quotationNo} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={item?.title} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (RM)</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={item?.amount?.toString()} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax / SST (RM)</Label>
          <Input
            id="taxAmount"
            name="taxAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={item?.taxAmount?.toString() ?? ""}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={item?.status ?? "DRAFT"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" name="issueDate" type="date" defaultValue={toDateInputValue(item?.issueDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil">Valid until</Label>
          <Input id="validUntil" name="validUntil" type="date" defaultValue={toDateInputValue(item?.validUntil)} />
        </div>
      </div>
    </>
  );
}

function AmountCell({ amount, taxAmount }: { amount: unknown; taxAmount: unknown }) {
  const subtotal = Number(amount);
  const tax = Number(taxAmount);
  return (
    <div>
      <div className="font-medium">{formatCurrency(subtotal + tax)}</div>
      {tax > 0 && (
        <div className="text-xs text-muted-foreground">
          {formatCurrency(subtotal)} + {formatCurrency(tax)} tax
        </div>
      )}
    </div>
  );
}

export default async function CostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [costItems, quotationItems] = await Promise.all([
    prisma.costEntry.findMany({
      where: { projectId },
      include: { attachments: true },
      orderBy: { date: "desc" },
    }),
    isAdmin
      ? prisma.quotation.findMany({
          where: { projectId },
          include: { attachments: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const withTax = (amount: unknown, taxAmount: unknown) => Number(amount) + Number(taxAmount);

  const totalBudget = costItems
    .filter((i) => i.type === "BUDGET")
    .reduce((sum, i) => sum + withTax(i.amount, i.taxAmount), 0);
  const totalActual = costItems
    .filter((i) => i.type === "ACTUAL")
    .reduce((sum, i) => sum + withTax(i.amount, i.taxAmount), 0);
  const totalAcceptedQuotes = quotationItems
    .filter((q) => q.status === "ACCEPTED")
    .reduce((sum, q) => sum + withTax(q.amount, q.taxAmount), 0);

  type Row = {
    key: string;
    kind: "cost" | "quotation";
    id: string;
    name: string;
    statusNode: React.ReactNode;
    amountNode: React.ReactNode;
    date: Date;
    attachments: Attachment[];
    editDialog: React.ReactNode;
    deleteAction: (formData: FormData) => Promise<void>;
    confirmMessage: string;
  };

  const rows: Row[] = [
    ...costItems.map(
      (item): Row => ({
        key: `cost-${item.id}`,
        id: item.id,
        kind: "cost",
        name: item.category,
        statusNode: <StatusBadge map={COST_TYPE} status={item.type} />,
        amountNode: <AmountCell amount={item.amount} taxAmount={item.taxAmount} />,
        date: item.date,
        attachments: item.attachments,
        editDialog: (
          <RecordDialog
            title="Edit Cost Entry"
            action={updateCostEntry.bind(null, item.id, projectId)}
            trigger={
              <Button variant="ghost" size="icon-sm">
                <PencilIcon className="size-4" />
              </Button>
            }
          >
            <CostFields item={item} />
          </RecordDialog>
        ),
        deleteAction: deleteCostEntry.bind(null, item.id, projectId),
        confirmMessage: "Delete this cost entry?",
      })
    ),
    ...quotationItems.map(
      (item): Row => ({
        key: `quotation-${item.id}`,
        id: item.id,
        kind: "quotation",
        name: `${item.quotationNo} — ${item.title}`,
        statusNode: <StatusBadge map={QUOTATION_STATUS} status={item.status} />,
        amountNode: <AmountCell amount={item.amount} taxAmount={item.taxAmount} />,
        date: item.issueDate ?? item.createdAt,
        attachments: item.attachments,
        editDialog: (
          <RecordDialog
            title="Edit Quotation"
            action={updateQuotation.bind(null, item.id, projectId)}
            trigger={
              <Button variant="ghost" size="icon-sm">
                <PencilIcon className="size-4" />
              </Button>
            }
          >
            <QuotationFields item={item} />
          </RecordDialog>
        ),
        deleteAction: deleteQuotation.bind(null, item.id, projectId),
        confirmMessage: "Delete this quotation?",
      })
    ),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalBudget)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Actual</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalActual)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Variance</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-xl font-semibold ${totalActual > totalBudget ? "text-red-600" : "text-green-600"}`}
          >
            {formatCurrency(totalBudget - totalActual)}
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Accepted Quotes</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatCurrency(totalAcceptedQuotes)}</CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <ScanInvoiceDialog projectId={projectId} />
        <RecordDialog
          title="New Cost Entry"
          action={createCostEntry.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Cost Entry
            </Button>
          }
        >
          <CostFields />
        </RecordDialog>
        {isAdmin && (
          <RecordDialog
            title="New Quotation"
            action={createQuotation.bind(null, projectId)}
            trigger={
              <Button variant="outline">
                <PlusIcon className="size-4" />
                New Quotation
              </Button>
            }
          >
            <QuotationFields />
          </RecordDialog>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <Badge variant="secondary">{row.kind === "cost" ? "Cost" : "Quotation"}</Badge>
              </TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.statusNode}</TableCell>
              <TableCell>{row.amountNode}</TableCell>
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell className="flex items-center gap-1">
                {row.editDialog}
                <AttachmentsDialog
                  entityType={row.kind === "cost" ? "COST_ENTRY" : "QUOTATION"}
                  entityId={row.id}
                  projectId={projectId}
                  label={row.name}
                  attachments={row.attachments}
                />
                <form action={row.deleteAction}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage={row.confirmMessage}>
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No cost entries or quotations yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
