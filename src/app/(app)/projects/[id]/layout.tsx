import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectTabs } from "@/components/project-tabs";
import { StatusBadge } from "@/components/status-badge";
import { PROJECT_STATUS } from "@/lib/status";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <StatusBadge map={PROJECT_STATUS} status={project.status} />
      </div>
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  );
}
