"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/helpers";
import { uploadFile, deleteFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function createProgressUpdate(projectId: string, formData: FormData) {
  const user = await requireUser();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a photo to upload.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Photo must be under 20MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const caption = formData.get("caption");
  const { url, fileName } = await uploadFile(file, `${projectId}/progress`);

  await prisma.progressUpdate.create({
    data: {
      projectId,
      photoUrl: url,
      fileName,
      caption: typeof caption === "string" && caption.trim() ? caption.trim() : null,
      createdById: user.id,
    },
  });

  revalidatePath(`/projects/${projectId}/progress`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProgressUpdate(id: string, projectId: string) {
  await requireUser();
  const update = await prisma.progressUpdate.findUniqueOrThrow({
    where: { id },
    select: { photoUrl: true },
  });
  await prisma.progressUpdate.delete({ where: { id } });
  await deleteFile(update.photoUrl);
  revalidatePath(`/projects/${projectId}/progress`);
  revalidatePath(`/projects/${projectId}`);
}
