import { formatCurrency } from "@/lib/format";

export function AmountCell({ amount, taxAmount }: { amount: unknown; taxAmount: unknown }) {
  const subtotal = Number(amount);
  const tax = Number(taxAmount);
  return (
    <div>
      <div className="font-medium">{formatCurrency(subtotal + tax)}</div>
      {tax > 0 && (
        <div className="text-xs text-muted-foreground">
          {formatCurrency(subtotal)} + {formatCurrency(tax)} tax
        </div>
      )}
    </div>
  );
}
