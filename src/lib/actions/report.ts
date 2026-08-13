"use server";

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/helpers";
import { generateProgressReportPdf } from "@/lib/pdf";

export async function sendProgressReport(projectId: string) {
  await requireUser();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { name: true, clientEmail: true },
  });

  if (!project.clientEmail) {
    throw new Error("Add a client email on the project's Overview tab first.");
  }

  const updates = await prisma.progressUpdate.findMany({
    where: { projectId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (updates.length === 0) {
    throw new Error("Post at least one progress update before sending a report.");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "Email sending isn't configured yet — add a RESEND_API_KEY environment variable."
    );
  }

  const pdfBytes = await generateProgressReportPdf(project.name, updates);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Construction Tracker <onboarding@resend.dev>",
    to: project.clientEmail,
    subject: `Progress Report — ${project.name}`,
    html: `<p>Hi,</p><p>Attached is the latest progress report for <strong>${project.name}</strong>, covering ${updates.length} site update${updates.length === 1 ? "" : "s"}.</p>`,
    attachments: [
      {
        filename: `${project.name.replace(/[^a-zA-Z0-9-_ ]/g, "")} Progress Report.pdf`,
        content: Buffer.from(pdfBytes),
      },
    ],
  });

  if (error) {
    throw new Error(error.message || "Failed to send email.");
  }
}
