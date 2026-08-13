import { prisma } from "@/lib/prisma";
import { createScheduleItem, updateScheduleItem, deleteScheduleItem } from "@/lib/actions/schedule";
import { StatusBadge } from "@/components/status-badge";
import { SCHEDULE_STATUS } from "@/lib/status";
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
import type { ScheduleItem } from "@prisma/client";

function ScheduleFields({ item }: { item?: ScheduleItem }) {
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
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={toDateInputValue(item?.startDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(item?.endDate)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={item?.status ?? "NOT_STARTED"}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="DELAYED">Delayed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const items = await prisma.scheduleItem.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecordDialog
          title="New Schedule Item"
          action={createScheduleItem.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Schedule Item
            </Button>
          }
        >
          <ScheduleFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>{formatDate(item.startDate)}</TableCell>
              <TableCell>{formatDate(item.endDate)}</TableCell>
              <TableCell>
                <StatusBadge map={SCHEDULE_STATUS} status={item.status} />
              </TableCell>
              <TableCell className="flex items-center gap-1">
                <RecordDialog
                  title="Edit Schedule Item"
                  action={updateScheduleItem.bind(null, item.id, projectId)}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                    </Button>
                  }
                >
                  <ScheduleFields item={item} />
                </RecordDialog>
                <form action={deleteScheduleItem.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton
                    variant="ghost"
                    size="sm"
                    confirmMessage="Delete this schedule item?"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No schedule items yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
