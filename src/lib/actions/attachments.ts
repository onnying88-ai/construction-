"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/helpers";
import { uploadFile, deleteFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export type AttachmentEntityType = "QUOTATION" | "INVOICE" | "CONTRACT" | "DRAWING" | "PERMIT";

function foreignKeyData(entityType: AttachmentEntityType, entityId: string) {
  switch (entityType) {
    case "QUOTATION":
      return { quotationId: entityId };
    case "INVOICE":
      return { invoiceId: entityId };
    case "CONTRACT":
      return { contractId: entityId };
    case "DRAWING":
      return { drawingId: entityId };
    case "PERMIT":
      return { permitId: entityId };
  }
}

export async function uploadAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  projectId: string,
  revalidatePathStr: string,
  formData: FormData
) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a file to upload.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File must be under 20MB.");
  }

  const { url, fileName } = await uploadFile(file, `${projectId}/${entityType.toLowerCase()}`);

  await prisma.attachment.create({
    data: {
      fileName,
      url,
      entityType,
      uploadedById: user.id,
      ...foreignKeyData(entityType, entityId),
    },
  });

  revalidatePath(revalidatePathStr);
}

export async function deleteAttachment(
  attachmentId: string,
  url: string,
  revalidatePathStr: string
) {
  await requireUser();
  await prisma.attachment.delete({ where: { id: attachmentId } });
  await deleteFile(url);
  revalidatePath(revalidatePathStr);
}
