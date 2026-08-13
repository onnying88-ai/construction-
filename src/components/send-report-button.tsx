"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendProgressReport } from "@/lib/actions/report";

export function SendReportButton({
  projectId,
  clientEmail,
  updateCount,
}: {
  projectId: string;
  clientEmail: string | null;
  updateCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || !clientEmail || updateCount === 0;

  function handleClick() {
    startTransition(async () => {
      try {
        await sendProgressReport(projectId);
        toast.success(`Report emailed to ${clientEmail}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send report");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={handleClick}
      title={!clientEmail ? "Add a client email on the Overview tab first" : undefined}
    >
      <MailIcon className="size-4" />
      {pending ? "Sending..." : "Email progress report"}
    </Button>
  );
}
