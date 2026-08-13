"use server";

import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validation";
import { requireAdmin, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";

export async function createInvoice(projectId: string, formData: FormData) {
  await requireAdmin();
  const data = invoiceSchema.parse(formToObject(formData));
  await prisma.invoice.create({ data: { ...data, projectId } });
  revalidatePath(`/projects/${projectId}/invoices`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function updateInvoice(id: string, projectId: string, formData: FormData) {
  await requireAdmin();
  const data = invoiceSchema.parse(formToObject(formData));
  await prisma.invoice.update({ where: { id }, data });
  revalidatePath(`/projects/${projectId}/invoices`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function deleteInvoice(id: string, projectId: string) {
  await requireAdmin();
  await prisma.invoice.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}/invoices`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}
