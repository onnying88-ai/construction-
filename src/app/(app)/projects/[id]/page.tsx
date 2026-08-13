import { prisma } from "@/lib/prisma";
import { updateProject, deleteProject } from "@/lib/actions/projects";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import Link from "next/link";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, counts] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id } }),
    Promise.all([
      prisma.scheduleItem.count({ where: { projectId: id } }),
      prisma.costEntry.count({ where: { projectId: id } }),
      prisma.quotation.count({ where: { projectId: id } }),
      prisma.invoice.count({ where: { projectId: id } }),
      prisma.contract.count({ where: { projectId: id } }),
      prisma.designDrawing.count({ where: { projectId: id } }),
      prisma.workPermit.count({ where: { projectId: id } }),
      prisma.maintenanceItem.count({ where: { projectId: id } }),
    ]),
  ]);

  const [
    scheduleCount,
    costCount,
    quotationCount,
    invoiceCount,
    contractCount,
    drawingCount,
    permitCount,
    maintenanceCount,
  ] = counts;

  const summary = [
    { label: "Schedule items", count: scheduleCount, href: `/projects/${id}/schedule` },
    { label: "Cost entries", count: costCount, href: `/projects/${id}/costing` },
    { label: "Quotations", count: quotationCount, href: `/projects/${id}/quotations` },
    { label: "Invoices", count: invoiceCount, href: `/projects/${id}/invoices` },
    { label: "Contracts", count: contractCount, href: `/projects/${id}/contracts` },
    { label: "Drawings", count: drawingCount, href: `/projects/${id}/drawings` },
    { label: "Permits", count: permitCount, href: `/projects/${id}/permits` },
    { label: "Maintenance", count: maintenanceCount, href: `/projects/${id}/maintenance` },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProject.bind(null, id)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" name="name" defaultValue={project.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={project.location ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={project.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" rows={2} defaultValue={project.address ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={toDateInputValue(project.startDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={toDateInputValue(project.endDate)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={4} defaultValue={project.notes ?? ""} />
              </div>
              <Button type="submit">Save changes</Button>
            </form>

            <Separator className="my-6" />

            <form action={deleteProject.bind(null, id)}>
              <p className="mb-2 text-sm text-muted-foreground">
                Deleting a project permanently removes all its schedule, cost, quotation,
                invoice, contract, drawing, permit, and maintenance records.
              </p>
              <ConfirmSubmitButton
                variant="destructive"
                confirmMessage={`Delete project "${project.name}" and all its records? This cannot be undone.`}
              >
                Delete project
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {summary.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between py-2 text-sm hover:text-primary"
                >
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
