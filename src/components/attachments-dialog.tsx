"use client";

import { useState } from "react";
import { PaperclipIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AttachmentsSection } from "@/components/attachments-section";
import type { AttachmentEntityType } from "@/lib/actions/attachments";
import type { Attachment } from "@prisma/client";

export function AttachmentsDialog({
  entityType,
  entityId,
  projectId,
  label,
  attachments,
}: {
  entityType: AttachmentEntityType;
  entityId: string;
  projectId: string;
  label: string;
  attachments: Attachment[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            <PaperclipIcon className="size-3.5" />
            {attachments.length > 0 ? attachments.length : ""}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Documents</DialogTitle>
        </DialogHeader>
        <AttachmentsSection
          entityType={entityType}
          entityId={entityId}
          projectId={projectId}
          label={label}
          attachments={attachments}
        />
      </DialogContent>
    </Dialog>
  );
}
