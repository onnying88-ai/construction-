import { Badge } from "@/components/ui/badge";
import { statusMeta } from "@/lib/status";

export function StatusBadge({
  map,
  status,
}: {
  map: Record<string, { label: string; className: string }>;
  status: string;
}) {
  const meta = statusMeta(map, status);
  return (
    <Badge variant="outline" className={meta.className}>
      {meta.label}
    </Badge>
  );
}
