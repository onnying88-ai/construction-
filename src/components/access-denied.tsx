import { LockIcon } from "lucide-react";

export function AccessDenied({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
      <LockIcon className="size-6" />
      <p className="font-medium text-foreground">Admin access required</p>
      <p className="text-sm">
        {module} is restricted to admins. Ask an admin if you need access.
      </p>
    </div>
  );
}
