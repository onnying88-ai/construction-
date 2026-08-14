import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AccessDenied } from "@/components/access-denied";
import { createInvoice, updateInvoice, deleteInvoice } from "@/lib/actions/invoices";
import { StatusBadge } from "@/components/status-badge";
import { INVOICE_STATUS } from "@/lib/status";
import { formatDate, toDateInputValue } from "@/lib/format";
import { RecordDialog } from "@/components/record-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AttachmentsSection } from "@/components/attachments-section";
import { AmountCell } from "@/components/amount-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Invoice } from "@prisma/client";

function InvoiceFields({ item }: { item?: Invoice }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="invoiceNo">Invoice No.</Label>
        <Input id="invoiceNo" name="invoiceNo" defaultValue={item?.invoiceNo} required />
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
        <Select name="status" defaultValue={item?.status ?? "UNPAID"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" name="issueDate" type="date" defaultValue={toDateInputValue(item?.issueDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={toDateInputValue(item?.dueDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidDate">Paid date</Label>
          <Input id="paidDate" name="paidDate" type="date" defaultValue={toDateInputValue(item?.paidDate)} />
        </div>
      </div>
    </>
  );
}

export default async function InvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return <AccessDenied module="Invoices" />;
  }
  const items = await prisma.invoice.findMany({
    where: { projectId },
    include: { attachments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecordDialog
          title="New Invoice"
          action={createInvoice.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Invoice
            </Button>
          }
        >
          <InvoiceFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.invoiceNo}</TableCell>
              <TableCell>
                <AmountCell amount={item.amount} taxAmount={item.taxAmount} />
              </TableCell>
              <TableCell>
                <StatusBadge map={INVOICE_STATUS} status={item.status} />
              </TableCell>
              <TableCell>{formatDate(item.dueDate)}</TableCell>
              <TableCell className="flex items-center gap-1">
                <RecordDialog
                  title="Edit Invoice"
                  action={updateInvoice.bind(null, item.id, projectId)}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                    </Button>
                  }
                >
                  <InvoiceFields item={item} />
                </RecordDialog>
                <form action={deleteInvoice.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this invoice?">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No invoices yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {items.map((item) => (
        <AttachmentsSection
          key={item.id}
          entityType="INVOICE"
          entityId={item.id}
          projectId={projectId}
          label={`Invoice ${item.invoiceNo}`}
          attachments={item.attachments}
        />
      ))}
    </div>
  );
}
