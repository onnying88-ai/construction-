"use server";

import { prisma } from "@/lib/prisma";
import { costEntrySchema } from "@/lib/validation";
import { requireUser, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createCostEntry(projectId: string, formData: FormData) {
  await requireUser();
  const data = costEntrySchema.parse(formToObject(formData));
  await prisma.costEntry.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/costing`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateCostEntry(id: string, projectId: string, formData: FormData) {
  await requireUser();
  const data = costEntrySchema.parse(formToObject(formData));
  await prisma.costEntry.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/costing`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteCostEntry(id: string, projectId: string) {
  await requireUser();
  await prisma.costEntry.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/costing`);
  revalidatePath(`/projects/${projectId}`);
}
