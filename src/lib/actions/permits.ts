"use server";

import { prisma } from "@/lib/prisma";
import { permitSchema } from "@/lib/validation";
import { requireUser, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createPermit(projectId: string, formData: FormData) {
  await requireUser();
  const data = permitSchema.parse(formToObject(formData));
  await prisma.workPermit.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/permits`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function updatePermit(id: string, projectId: string, formData: FormData) {
  await requireUser();
  const data = permitSchema.parse(formToObject(formData));
  await prisma.workPermit.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/permits`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function deletePermit(id: string, projectId: string) {
  await requireUser();
  await prisma.workPermit.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/permits`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}
