import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AccessDenied } from "@/components/access-denied";
import { createContract, updateContract, deleteContract } from "@/lib/actions/contracts";
import { StatusBadge } from "@/components/status-badge";
import { CONTRACT_STATUS } from "@/lib/status";
import { formatCurrency, toDateInputValue } from "@/lib/format";
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
import type { Contract } from "@prisma/client";

function ContractFields({ item }: { item?: Contract }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={item?.title} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contractNo">Contract No.</Label>
          <Input id="contractNo" name="contractNo" defaultValue={item?.contractNo ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="counterparty">Counterparty</Label>
          <Input id="counterparty" name="counterparty" defaultValue={item?.counterparty ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Value (RM)</Label>
          <Input id="value" name="value" type="number" step="0.01" min="0" defaultValue={item?.value?.toString()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={item?.status ?? "DRAFT"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING_SIGNATURE">Pending Signature</SelectItem>
              <SelectItem value="SIGNED">Signed</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signDate">Sign date</Label>
        <Input id="signDate" name="signDate" type="date" defaultValue={toDateInputValue(item?.signDate)} />
      </div>
    </>
  );
}

export default async function ContractsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return <AccessDenied module="Contracts" />;
  }
  const items = await prisma.contract.findMany({
    where: { projectId },
    include: { attachments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecordDialog
          title="New Contract"
          action={createContract.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Contract
            </Button>
          }
        >
          <ContractFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Counterparty</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>{item.counterparty ?? "-"}</TableCell>
              <TableCell>{formatCurrency(item.value?.toString())}</TableCell>
              <TableCell>
                <StatusBadge map={CONTRACT_STATUS} status={item.status} />
              </TableCell>
              <TableCell className="flex items-center gap-1">
                <RecordDialog
                  title="Edit Contract"
                  action={updateContract.bind(null, item.id, projectId)}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                    </Button>
                  }
                >
                  <ContractFields item={item} />
                </RecordDialog>
                <form action={deleteContract.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this contract?">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No contracts yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {items.map((item) => (
        <AttachmentsSection
          key={item.id}
          entityType="CONTRACT"
          entityId={item.id}
          projectId={projectId}
          label={item.title}
          attachments={item.attachments}
        />
      ))}
    </div>
  );
}
