"use server";

import { prisma } from "@/lib/prisma";
import { quotationSchema } from "@/lib/validation";
import { requireUser, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createQuotation(projectId: string, formData: FormData) {
  await requireUser();
  const data = quotationSchema.parse(formToObject(formData));
  await prisma.quotation.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/quotations`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateQuotation(id: string, projectId: string, formData: FormData) {
  await requireUser();
  const data = quotationSchema.parse(formToObject(formData));
  await prisma.quotation.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/quotations`);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteQuotation(id: string, projectId: string) {
  await requireUser();
  await prisma.quotation.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/quotations`);
  revalidatePath(`/projects/${projectId}`);
}
