import { prisma } from "@/lib/prisma";
import {
  createMaintenanceItem,
  updateMaintenanceItem,
  deleteMaintenanceItem,
} from "@/lib/actions/maintenance";
import { StatusBadge } from "@/components/status-badge";
import { MAINTENANCE_STATUS, MAINTENANCE_PRIORITY } from "@/lib/status";
import { formatDate, toDateInputValue } from "@/lib/format";
import { RecordDialog } from "@/components/record-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { MaintenanceItem } from "@prisma/client";

function MaintenanceFields({ item }: { item?: MaintenanceItem }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={item?.title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={item?.status ?? "PENDING"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue={item?.priority ?? "MEDIUM"}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={toDateInputValue(item?.dueDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="completedDate">Completed date</Label>
          <Input id="completedDate" name="completedDate" type="date" defaultValue={toDateInputValue(item?.completedDate)} />
        </div>
      </div>
    </>
  );
}

export default async function MaintenancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const items = await prisma.maintenanceItem.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecordDialog
          title="New Maintenance Item"
          action={createMaintenanceItem.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Maintenance Item
            </Button>
          }
        >
          <MaintenanceFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>
                <StatusBadge map={MAINTENANCE_PRIORITY} status={item.priority} />
              </TableCell>
              <TableCell>
                <StatusBadge map={MAINTENANCE_STATUS} status={item.status} />
              </TableCell>
              <TableCell>{formatDate(item.dueDate)}</TableCell>
              <TableCell className="flex items-center gap-1">
                <RecordDialog
                  title="Edit Maintenance Item"
                  action={updateMaintenanceItem.bind(null, item.id, projectId)}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                    </Button>
                  }
                >
                  <MaintenanceFields item={item} />
                </RecordDialog>
                <form action={deleteMaintenanceItem.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this maintenance item?">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No maintenance items yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
