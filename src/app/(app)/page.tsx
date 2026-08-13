import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { PROJECT_STATUS } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { PlusIcon, AlertTriangleIcon } from "lucide-react";

export default async function DashboardPage() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [projects, overdueInvoices, expiringPermits, delayedSchedule, pendingMaintenance] =
    await Promise.all([
      prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.invoice.findMany({
        where: { status: { not: "PAID" }, dueDate: { lt: now } },
        include: { project: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.workPermit.findMany({
        where: { status: "APPROVED", expiryDate: { lte: in30Days } },
        include: { project: true },
        orderBy: { expiryDate: "asc" },
      }),
      prisma.scheduleItem.findMany({
        where: {
          status: { not: "DONE" },
          OR: [{ status: "DELAYED" }, { endDate: { lt: now } }],
        },
        include: { project: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.maintenanceItem.findMany({
        where: {
          status: { not: "COMPLETED" },
          OR: [{ status: "PENDING" }, { dueDate: { lt: now } }],
        },
        include: { project: true },
        orderBy: { dueDate: "asc" },
      }),
    ]);

  const hasAlerts =
    overdueInvoices.length + expiringPermits.length + delayedSchedule.length + pendingMaintenance.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button render={<Link href="/projects/new" />} nativeButton={false}>
          <PlusIcon className="size-4" />
          New Project
        </Button>
      </div>

      {hasAlerts && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangleIcon className="size-4 text-amber-600" />
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AlertGroup
              title="Overdue invoices"
              items={overdueInvoices.map((i) => ({
                href: `/projects/${i.projectId}/invoices`,
                label: `${i.project.name} — ${i.invoiceNo}`,
                detail: formatCurrency(i.amount.toString()),
              }))}
            />
            <AlertGroup
              title="Permits expiring soon"
              items={expiringPermits.map((p) => ({
                href: `/projects/${p.projectId}/permits`,
                label: `${p.project.name} — ${p.permitType}`,
                detail: formatDate(p.expiryDate),
              }))}
            />
            <AlertGroup
              title="Delayed schedule items"
              items={delayedSchedule.map((s) => ({
                href: `/projects/${s.projectId}/schedule`,
                label: `${s.project.name} — ${s.title}`,
                detail: formatDate(s.endDate),
              }))}
            />
            <AlertGroup
              title="Pending maintenance"
              items={pendingMaintenance.map((m) => ({
                href: `/projects/${m.projectId}/maintenance`,
                label: `${m.project.name} — ${m.title}`,
                detail: m.dueDate ? formatDate(m.dueDate) : "No due date",
              }))}
            />
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects yet. Create your first project to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <StatusBadge map={PROJECT_STATUS} status={project.status} />
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {project.location && <p>{project.location}</p>}
                  {project.startDate && <p>Start: {formatDate(project.startDate)}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertGroup({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; detail: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {title} ({items.length})
      </p>
      <ul className="space-y-1">
        {items.slice(0, 5).map((item, i) => (
          <li key={i}>
            <Link
              href={item.href}
              className="block rounded-md px-2 py-1 text-sm hover:bg-background"
            >
              <div className="truncate">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.detail}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
