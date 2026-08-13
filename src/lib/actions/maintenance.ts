"use server";

import { prisma } from "@/lib/prisma";
import { maintenanceSchema } from "@/lib/validation";
import { requireUser, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createMaintenanceItem(projectId: string, formData: FormData) {
  await requireUser();
  const data = maintenanceSchema.parse(formToObject(formData));
  await prisma.maintenanceItem.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/maintenance`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function updateMaintenanceItem(id: string, projectId: string, formData: FormData) {
  await requireUser();
  const data = maintenanceSchema.parse(formToObject(formData));
  await prisma.maintenanceItem.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/maintenance`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function deleteMaintenanceItem(id: string, projectId: string) {
  await requireUser();
  await prisma.maintenanceItem.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/maintenance`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}
