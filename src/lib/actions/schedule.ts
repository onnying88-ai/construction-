"use server";

import { prisma } from "@/lib/prisma";
import { scheduleItemSchema } from "@/lib/validation";
import { requireUser, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createScheduleItem(projectId: string, formData: FormData) {
  await requireUser();
  const data = scheduleItemSchema.parse(formToObject(formData));
  await prisma.scheduleItem.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function updateScheduleItem(id: string, projectId: string, formData: FormData) {
  await requireUser();
  const data = scheduleItemSchema.parse(formToObject(formData));
  await prisma.scheduleItem.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function deleteScheduleItem(id: string, projectId: string) {
  await requireUser();
  await prisma.scheduleItem.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
}
