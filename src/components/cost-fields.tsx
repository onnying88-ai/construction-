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
import { toDateInputValue } from "@/lib/format";
import type { CostEntry } from "@prisma/client";

/** Shared by the Costing tab and the Summary page. `defaultType` only applies to new entries. */
export function CostFields({ item, defaultType = "BUDGET" }: { item?: CostEntry; defaultType?: "BUDGET" | "ACTUAL" }) {
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
          <Select name="type" defaultValue={item?.type ?? defaultType}>
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
        <Label htmlFor="taxAmount">Tax / SST (RM)</Label>
        <Input
          id="taxAmount"
          name="taxAmount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item?.taxAmount?.toString() ?? ""}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={toDateInputValue(item?.date) || undefined} required />
      </div>
    </>
  );
}
