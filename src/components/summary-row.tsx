"use client";

import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * One project row on the Summary page. Clicking the name toggles a detail row
 * (the project's cost lines with add / edit / delete). `cells` and `detail` are
 * server-rendered by the page and passed in, so the dialogs inside keep their
 * server actions.
 */
export function SummaryRow({
  name,
  cells,
  detail,
  columns,
}: {
  name: ReactNode;
  cells: ReactNode;
  detail: ReactNode;
  columns: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow className={cn(open && "bg-muted/40")}>
        <TableCell>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-start gap-1 text-left"
          >
            <ChevronRightIcon className={cn("mt-0.5 size-4 shrink-0 transition-transform", open && "rotate-90")} />
            <span>{name}</span>
          </button>
        </TableCell>
        {cells}
      </TableRow>
      {open && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={columns} className="whitespace-normal">
            {detail}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
