import { prisma } from "@/lib/prisma";
import { createCostEntry, updateCostEntry, deleteCostEntry } from "@/lib/actions/cost";
import { StatusBadge } from "@/components/status-badge";
import { COST_TYPE } from "@/lib/status";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { RecordDialog } from "@/components/record-dialog";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, PencilIcon } from "lucide-react";
import type { CostEntry } from "@prisma/client";

function CostFields({ item }: { item?: CostEntry }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" defaultValue={item?.category} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue={item?.type ?? "BUDGET"}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUDGET">Budget</SelectItem>
              <SelectItem value="ACTUAL">Actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (RM)</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={item?.amount?.toString()} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={toDateInputValue(item?.date) || undefined} required />
      </div>
    </>
  );
}

export default async function CostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const items = await prisma.costEntry.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
  });

  const totalBudget = items
    .filter((i) => i.type === "BUDGET")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const totalActual = items
    .filter((i) => i.type === "ACTUAL")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalBudget)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Actual</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalActual)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Variance</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-xl font-semibold ${totalActual > totalBudget ? "text-red-600" : "text-green-600"}`}
          >
            {formatCurrency(totalBudget - totalActual)}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <RecordDialog
          title="New Cost Entry"
          action={createCostEntry.bind(null, projectId)}
          trigger={
            <Button>
              <PlusIcon className="size-4" />
              New Cost Entry
            </Button>
          }
        >
          <CostFields />
        </RecordDialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.category}</TableCell>
              <TableCell>
                <StatusBadge map={COST_TYPE} status={item.type} />
              </TableCell>
              <TableCell>{formatCurrency(item.amount.toString())}</TableCell>
              <TableCell>{formatDate(item.date)}</TableCell>
              <TableCell className="flex items-center gap-1">
                <RecordDialog
                  title="Edit Cost Entry"
                  action={updateCostEntry.bind(null, item.id, projectId)}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <PencilIcon className="size-4" />
                    </Button>
                  }
                >
                  <CostFields item={item} />
                </RecordDialog>
                <form action={deleteCostEntry.bind(null, item.id, projectId)}>
                  <ConfirmSubmitButton variant="ghost" size="sm" confirmMessage="Delete this cost entry?">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No cost entries yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
