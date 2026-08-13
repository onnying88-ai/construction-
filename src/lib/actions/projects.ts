"use server";

import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validation";
import { requireUser, formToObject } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  await requireUser();
  const data = projectSchema.parse(formToObject(formData));
  const project = await prisma.project.create({ data });
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  await requireUser();
  const data = projectSchema.parse(formToObject(formData));
  await prisma.project.update({ where: { id: projectId }, data });
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  await requireUser();
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/");
  redirect("/");
}
