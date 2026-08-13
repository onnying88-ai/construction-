"use server";

import { prisma } from "@/lib/prisma";
import { contractSchema } from "@/lib/validation";
import { requireAdmin, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createContract(projectId: string, formData: FormData) {
  await requireAdmin();
  const data = contractSchema.parse(formToObject(formData));
  await prisma.contract.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/contracts`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateContract(id: string, projectId: string, formData: FormData) {
  await requireAdmin();
  const data = contractSchema.parse(formToObject(formData));
  await prisma.contract.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/contracts`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteContract(id: string, projectId: string) {
  await requireAdmin();
  await prisma.contract.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/contracts`);
  revalidatePath(`/projects/${projectId}`);
}
