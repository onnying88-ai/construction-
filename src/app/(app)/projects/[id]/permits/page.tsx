import { prisma } from "@/lib/prisma";
import { createPermit, updatePermit, deletePermit } from "@/lib/actions/permits";
import { StatusBadge } from "@/components/status-badge";
import { PERMIT_STATUS } from "@/lib/status";
import { formatDate, toDateInputValue } from "@/lib/format";
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
import type { WorkPermit } from "@prisma/client";

function PermitFields({ item }: { item?: WorkPermit }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="permitType">Permit type</Label>
        <Input
          id="permitType"
          name="permitType"
          placeholder="e.g. TNB Electric, Fire Dept, Local Council"
          defaultValue={item?.permitType}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="permitNo">Permit No.</Label>
          <Input id="permitNo" name="permitNo" defaultValue={item?.permitNo ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={item?.status ?? "NOT_STARTED"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="submittedDate">Submitted</Label>
          <Input id="submittedDate" name="submittedDate" type="date" defaultValue={toDateInputValue(item?.submittedDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="approvedDate">Approved</Label>
          <Input id="approvedDate" name="approvedDate" type="date" defaultValue={toDateInputValue(item?.approvedDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry</Label>
          <Input id="expiryDate" name="expiryDate" type="date" defaultValue={toDateInputValue(item?.expiryDate)} />
        </div>
      </div>
    </>
  );
}

export default async function PermitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const items = await prisma.workPermit.findMany({
    where: { projectId },
    include: { attachments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecordDialog
          title="New Work Permit"
          action={createPermit.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Permit
            </Button>
          }
        >
          <PermitFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Permit No.</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.permitType}</TableCell>
              <TableCell>{item.permitNo ?? "-"}</TableCell>
              <TableCell>
                <StatusBadge map={PERMIT_STATUS} status={item.status} />
              </TableCell>
              <TableCell>{formatDate(item.expiryDate)}</TableCell>
              <TableCell className="flex items-center gap-1">
                <RecordDialog
                  title="Edit Permit"
                  action={updatePermit.bind(null, item.id, projectId)}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                    </Button>
                  }
                >
                  <PermitFields item={item} />
                </RecordDialog>
                <form action={deletePermit.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this permit?">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No work permits yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {items.map((item) => (
        <AttachmentsSection
          key={item.id}
          entityType="PERMIT"
          entityId={item.id}
          projectId={projectId}
          label={item.permitType}
          attachments={item.attachments}
        />
      ))}
    </div>
  );
}
