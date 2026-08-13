import { prisma } from "@/lib/prisma";
import { createDrawing, updateDrawing, deleteDrawing } from "@/lib/actions/drawings";
import { formatDate, toDateInputValue } from "@/lib/format";
import { RecordDialog } from "@/components/record-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AttachmentsSection } from "@/components/attachments-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, PencilIcon } from "lucide-react";
import type { DesignDrawing } from "@prisma/client";

function DrawingFields({ item }: { item?: DesignDrawing }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={item?.title} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discipline">Discipline</Label>
          <Input id="discipline" name="discipline" placeholder="e.g. M&E, Structural" defaultValue={item?.discipline ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="revision">Revision</Label>
          <Input id="revision" name="revision" defaultValue={item?.revision ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="uploadDate">Date</Label>
        <Input id="uploadDate" name="uploadDate" type="date" defaultValue={toDateInputValue(item?.uploadDate)} />
      </div>
    </>
  );
}

export default async function DrawingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const items = await prisma.designDrawing.findMany({
    where: { projectId },
    include: { attachments: true },
    orderBy: { uploadDate: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RecordDialog
          title="New Design Drawing"
          action={createDrawing.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Drawing
            </Button>
          }
        >
          <DrawingFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Discipline</TableHead>
            <TableHead>Revision</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>{item.discipline ?? "-"}</TableCell>
              <TableCell>{item.revision ?? "-"}</TableCell>
              <TableCell>{formatDate(item.uploadDate)}</TableCell>
              <TableCell className="flex items-center gap-1">
                <RecordDialog
                  title="Edit Drawing"
                  action={updateDrawing.bind(null, item.id, projectId)}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                    </Button>
                  }
                >
                  <DrawingFields item={item} />
                </RecordDialog>
                <form action={deleteDrawing.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this drawing?">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No design drawings yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {items.map((item) => (
        <AttachmentsSection
          key={item.id}
          entityType="DRAWING"
          entityId={item.id}
          projectId={projectId}
          label={item.title}
          attachments={item.attachments}
        />
      ))}
    </div>
  );
}
