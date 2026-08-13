"use server";

import { prisma } from "@/lib/prisma";
import { drawingSchema } from "@/lib/validation";
import { requireUser, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createDrawing(projectId: string, formData: FormData) {
  await requireUser();
  const data = drawingSchema.parse(formToObject(formData));
  await prisma.designDrawing.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/drawings`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateDrawing(id: string, projectId: string, formData: FormData) {
  await requireUser();
  const data = drawingSchema.parse(formToObject(formData));
  await prisma.designDrawing.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/drawings`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteDrawing(id: string, projectId: string) {
  await requireUser();
  await prisma.designDrawing.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/drawings`);
  revalidatePath(`/projects/${projectId}`);
}
