import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AccessDenied } from "@/components/access-denied";
import { createQuotation, updateQuotation, deleteQuotation } from "@/lib/actions/quotations";
import { StatusBadge } from "@/components/status-badge";
import { QUOTATION_STATUS } from "@/lib/status";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { RecordDialog } from "@/components/record-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AttachmentsSection } from "@/components/attachments-section";
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
import type { Quotation } from "@prisma/client";

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

export default async function QuotationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return <AccessDenied module="Quotations" />;
  }
  const items = await prisma.quotation.findMany({
    where: { projectId },
    include: { attachments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecordDialog
          title="New Quotation"
          action={createQuotation.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Quotation
            </Button>
          }
        >
          <QuotationFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Valid Until</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.quotationNo}</TableCell>
              <TableCell>{item.title}</TableCell>
              <TableCell>{formatCurrency(item.amount.toString())}</TableCell>
              <TableCell>
                <StatusBadge map={QUOTATION_STATUS} status={item.status} />
              </TableCell>
              <TableCell>{formatDate(item.validUntil)}</TableCell>
              <TableCell className="flex items-center gap-1">
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
                <form action={deleteQuotation.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this quotation?">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No quotations yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {items.map((item) => (
        <AttachmentsSection
          key={item.id}
          entityType="QUOTATION"
          entityId={item.id}
          projectId={projectId}
          label={`${item.quotationNo} — ${item.title}`}
          attachments={item.attachments}
        />
      ))}
    </div>
  );
}
