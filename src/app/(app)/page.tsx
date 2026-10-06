import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROJECT_STATUS } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/format";
import { PlusIcon, AlertTriangleIcon, UploadIcon, SigmaIcon } from "lucide-react";

const DAY = 24 * 60 * 60 * 1000;
const STATUS_ORDER = ["IN_PROGRESS", "PLANNING", "ON_HOLD", "COMPLETED"] as const;
const FILTERS = [{ key: "ALL", label: "All" }, ...STATUS_ORDER.map((s) => ({ key: s, label: PROJECT_STATUS[s].label }))];

const n = (v: unknown) => Number(v);
const rm = (v: number) => `RM ${Math.round(v).toLocaleString("en-US")}`;

function group<T extends { projectId: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    if (!map.has(r.projectId)) map.set(r.projectId, []);
    map.get(r.projectId)!.push(r);
  }
  return map;
}

function ago(date: Date, now: Date) {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(date);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const filter = FILTERS.some((f) => f.key === statusParam) ? statusParam! : "ALL";

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * DAY);
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [projects, overdueInvoices, expiringPermits, delayedSchedule, pendingMaintenance, quotations, invoices] =
    await Promise.all([
      prisma.project.findMany({
        orderBy: { name: "asc" },
        include: {
          scheduleItems: { select: { status: true, endDate: true } },
          permits: { select: { status: true, expiryDate: true } },
          maintenanceItems: { select: { status: true, dueDate: true } },
          costEntries: { where: { type: "ACTUAL" }, select: { amount: true, taxAmount: true } },
          progressUpdates: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      }),
      isAdmin
        ? prisma.invoice.findMany({
            where: { status: { not: "PAID" }, dueDate: { lt: now } },
            include: { project: true },
            orderBy: { dueDate: "asc" },
          })
        : Promise.resolve([]),
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
      isAdmin ? prisma.quotation.findMany({ select: { projectId: true, status: true, amount: true } }) : Promise.resolve([]),
      isAdmin
        ? prisma.invoice.findMany({ select: { projectId: true, status: true, amount: true, taxAmount: true } })
        : Promise.resolve([]),
    ]);

  const hasAlerts =
    overdueInvoices.length + expiringPermits.length + delayedSchedule.length + pendingMaintenance.length > 0;

  const quotesBy = group(quotations);
  const invoicesBy = group(invoices);
  const overdueBy = group(overdueInvoices);

  const all = projects.map((p) => {
    const tasks = p.scheduleItems;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const delayed = tasks.filter((t) => t.status !== "DONE" && (t.status === "DELAYED" || (t.endDate && t.endDate < now))).length;
    const approved = p.permits.filter((x) => x.status === "APPROVED").length;
    const expiring = p.permits.filter((x) => x.status === "APPROVED" && x.expiryDate && x.expiryDate <= in30Days).length;
    const openMaint = p.maintenanceItems.filter((m) => m.status !== "COMPLETED").length;
    const cost = p.costEntries.reduce((s, c) => s + n(c.amount) + n(c.taxAmount), 0);
    const revenue = (quotesBy.get(p.id) ?? []).filter((q) => q.status === "ACCEPTED").reduce((s, q) => s + n(q.amount), 0);
    const billed = (invoicesBy.get(p.id) ?? []).reduce((s, i) => s + n(i.amount) + n(i.taxAmount), 0);
    const received = (invoicesBy.get(p.id) ?? [])
      .filter((i) => i.status === "PAID")
      .reduce((s, i) => s + n(i.amount) + n(i.taxAmount), 0);
    return {
      p,
      tasks: tasks.length,
      done,
      delayed,
      pct: tasks.length ? Math.round((done / tasks.length) * 100) : null,
      permits: p.permits.length,
      approved,
      expiring,
      openMaint,
      cost,
      revenue,
      profit: revenue - cost,
      outstanding: billed - received,
      overdueInvoices: overdueBy.get(p.id)?.length ?? 0,
      lastUpdate: p.progressUpdates[0]?.createdAt ?? null,
    };
  });

  const counts: Record<string, number> = { ALL: all.length };
  for (const s of STATUS_ORDER) counts[s] = all.filter((r) => r.p.status === s).length;

  const visible = all
    .filter((r) => filter === "ALL" || r.p.status === filter)
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.p.status as (typeof STATUS_ORDER)[number]) -
          STATUS_ORDER.indexOf(b.p.status as (typeof STATUS_ORDER)[number]) || a.p.name.localeCompare(b.p.name)
    );

  const totals = {
    cost: all.reduce((s, r) => s + r.cost, 0),
    revenue: all.reduce((s, r) => s + r.revenue, 0),
    outstanding: all.reduce((s, r) => s + r.outstanding, 0),
    delayed: delayedSchedule.length,
    maintenance: pendingMaintenance.length,
    expiring: expiringPermits.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button variant="outline" render={<Link href="/summary" />} nativeButton={false}>
              <SigmaIcon className="size-4" />
              Financial Summary
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" render={<Link href="/import" />} nativeButton={false}>
              <UploadIcon className="size-4" />
              Import Masterlist
            </Button>
          )}
          <Button render={<Link href="/projects/new" />} nativeButton={false}>
            <PlusIcon className="size-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Projects" value={String(counts.ALL)} sub={`${counts.IN_PROGRESS} in progress · ${counts.COMPLETED} completed`} />
        {isAdmin && <Stat label="Revenue (accepted)" value={rm(totals.revenue)} sub="excl. SST" />}
        <Stat label="Cost to date" value={rm(totals.cost)} sub="actual, incl. SST paid" />
        {isAdmin && (
          <Stat
            label="Outstanding"
            value={rm(totals.outstanding)}
            sub="unpaid invoices"
            tone={totals.outstanding > 0 ? "text-amber-600" : undefined}
          />
        )}
        <Stat
          label="Delayed tasks"
          value={String(totals.delayed)}
          sub="past end date"
          tone={totals.delayed > 0 ? "text-red-600" : undefined}
        />
        <Stat
          label="Open maintenance"
          value={String(totals.maintenance)}
          sub={`${totals.expiring} permit${totals.expiring === 1 ? "" : "s"} expiring`}
          tone={totals.maintenance > 0 ? "text-amber-600" : undefined}
        />
      </div>

      {hasAlerts && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <details className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 text-sm [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-base font-medium">
                <AlertTriangleIcon className="size-4 text-amber-600" />
                Needs attention
              </span>
              <span className="text-muted-foreground">
                {[
                  isAdmin && overdueInvoices.length > 0 && `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`,
                  expiringPermits.length > 0 && `${expiringPermits.length} permit${expiringPermits.length === 1 ? "" : "s"} expiring`,
                  delayedSchedule.length > 0 && `${delayedSchedule.length} delayed task${delayedSchedule.length === 1 ? "" : "s"}`,
                  pendingMaintenance.length > 0 && `${pendingMaintenance.length} maintenance`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Tap to see details</span>
            </summary>
          <CardContent className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </details>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "ALL" ? "/" : `/?status=${f.key}`}
            className={buttonVariants({ variant: filter === f.key ? "default" : "outline", size: "sm" })}
          >
            {f.label} ({counts[f.key]})
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet. Create your first project to get started.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects with this status.</p>
      ) : (
        <>
          {/* Wide screens: one dense table */}
          <div className="hidden overflow-x-auto rounded-lg border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="min-w-36">Schedule</TableHead>
                  <TableHead>Permits</TableHead>
                  <TableHead>Maintenance</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  {isAdmin && <TableHead className="text-right">Revenue</TableHead>}
                  {isAdmin && <TableHead className="text-right">Profit</TableHead>}
                  {isAdmin && <TableHead className="text-right">Outstanding</TableHead>}
                  <TableHead>Last update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={r.p.id}>
                    <TableCell className="max-w-64 whitespace-normal">
                      <Link href={`/projects/${r.p.id}`} className="font-medium hover:underline">
                        {r.p.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <StatusBadge map={PROJECT_STATUS} status={r.p.status} />
                        {r.overdueInvoices > 0 && <Flag tone="red">{r.overdueInvoices} overdue invoice</Flag>}
                      </div>
                      {r.p.location && <div className="mt-1 text-xs text-muted-foreground">{r.p.location}</div>}
                    </TableCell>
                    <TableCell>
                      <Progress pct={r.pct} />
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.tasks ? `${r.done}/${r.tasks} done` : "No schedule"}
                        {r.delayed > 0 && <span className="ml-1 font-medium text-red-600">· {r.delayed} delayed</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.permits ? `${r.approved}/${r.permits} approved` : <Dash />}
                      {r.expiring > 0 && <div className="text-xs font-medium text-amber-600">{r.expiring} expiring</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.openMaint > 0 ? <span className="font-medium text-amber-600">{r.openMaint} open</span> : <Dash />}
                    </TableCell>
                    <TableCell className="text-right">{r.cost > 0 ? rm(r.cost) : <Dash />}</TableCell>
                    {isAdmin && <TableCell className="text-right">{r.revenue > 0 ? rm(r.revenue) : <Dash />}</TableCell>}
                    {isAdmin && (
                      <TableCell className="text-right">
                        {r.revenue === 0 ? (
                          <Dash />
                        ) : r.cost === 0 ? (
                          <span className="text-xs text-amber-600">no cost yet</span>
                        ) : (
                          <span className={r.profit < 0 ? "text-red-600" : ""}>
                            {rm(r.profit)}
                            <span className="block text-xs text-muted-foreground">{Math.round((r.profit / r.revenue) * 100)}%</span>
                          </span>
                        )}
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell className={`text-right ${r.outstanding > 0.5 ? "font-medium text-amber-600" : ""}`}>
                        {r.outstanding > 0.5 ? rm(r.outstanding) : <Dash />}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {r.lastUpdate ? ago(r.lastUpdate, now) : <Dash />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phones: one card per project */}
          <div className="space-y-3 md:hidden">
            {visible.map((r) => (
              <Link key={r.p.id} href={`/projects/${r.p.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{r.p.name}</CardTitle>
                      <StatusBadge map={PROJECT_STATUS} status={r.p.status} />
                    </div>
                    {r.p.location && <p className="text-xs text-muted-foreground">{r.p.location}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Progress pct={r.pct} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.tasks ? `${r.done}/${r.tasks} tasks done` : "No schedule"}
                        {r.delayed > 0 && <span className="ml-1 font-medium text-red-600">· {r.delayed} delayed</span>}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <Row label="Cost" value={r.cost > 0 ? rm(r.cost) : "—"} />
                      {isAdmin && <Row label="Revenue" value={r.revenue > 0 ? rm(r.revenue) : "—"} />}
                      {isAdmin && (
                        <Row
                          label="Profit"
                          value={r.revenue === 0 ? "—" : r.cost === 0 ? "no cost yet" : rm(r.profit)}
                          tone={r.revenue > 0 && r.cost > 0 && r.profit < 0 ? "text-red-600" : undefined}
                        />
                      )}
                      {isAdmin && (
                        <Row
                          label="Outstanding"
                          value={r.outstanding > 0.5 ? rm(r.outstanding) : "—"}
                          tone={r.outstanding > 0.5 ? "text-amber-600" : undefined}
                        />
                      )}
                      <Row label="Permits" value={r.permits ? `${r.approved}/${r.permits} approved` : "—"} />
                      <Row
                        label="Maintenance"
                        value={r.openMaint > 0 ? `${r.openMaint} open` : "—"}
                        tone={r.openMaint > 0 ? "text-amber-600" : undefined}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {r.overdueInvoices > 0 && <Flag tone="red">{r.overdueInvoices} overdue invoice</Flag>}
                      {r.expiring > 0 && <Flag tone="amber">{r.expiring} permit expiring</Flag>}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {r.lastUpdate ? `Updated ${ago(r.lastUpdate, now)}` : "No progress photos"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold leading-tight ${tone ?? ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Progress({ pct }: { pct: number | null }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct ?? 0}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct ?? 0}%` }} />
    </div>
  );
}

function Flag({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className={tone === "red" ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700"}
    >
      {children}
    </Badge>
  );
}

const Dash = () => <span className="text-muted-foreground">—</span>;

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone}>{value}</span>
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
            <Link href={item.href} className="block rounded-md px-2 py-1 text-sm hover:bg-background">
              <div className="truncate">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.detail}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
