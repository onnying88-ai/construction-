"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { PaperclipIcon, XIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadAttachment,
  deleteAttachment,
  type AttachmentEntityType,
} from "@/lib/actions/attachments";
import type { Attachment } from "@prisma/client";

const ENTITY_ROUTE: Record<AttachmentEntityType, string> = {
  QUOTATION: "quotations",
  INVOICE: "invoices",
  CONTRACT: "contracts",
  DRAWING: "drawings",
  PERMIT: "permits",
  COST_ENTRY: "costing",
};

export function AttachmentsSection({
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
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const revalidatePathStr = `/projects/${projectId}/${ENTITY_ROUTE[entityType]}`;

  function handleUpload(formData: FormData) {
    startTransition(async () => {
      try {
        await uploadAttachment(entityType, entityId, projectId, revalidatePathStr, formData);
        formRef.current?.reset();
        toast.success("File uploaded");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleDelete(attachmentId: string, url: string) {
    startTransition(async () => {
      try {
        await deleteAttachment(attachmentId, url, revalidatePathStr);
        toast.success("Attachment removed");
      } catch {
        toast.error("Failed to remove attachment");
      }
    });
  }

  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <PaperclipIcon className="size-4 text-muted-foreground" />
        {label}
      </div>
      {attachments.length > 0 && (
        <ul className="mb-2 space-y-1">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary hover:underline"
              >
                {a.fileName}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                onClick={() => handleDelete(a.id, a.url)}
              >
                <XIcon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} action={handleUpload} className="flex items-center gap-2">
        <input
          type="file"
          name="file"
          required
          className="flex-1 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <UploadIcon className="size-3.5" />
          {pending ? "Uploading..." : "Upload"}
        </Button>
      </form>
    </div>
  );
}
