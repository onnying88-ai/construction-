"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProgressUpdate } from "@/lib/actions/progress";

export function ProgressUploadForm({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await createProgressUpdate(projectId, formData);
        formRef.current?.reset();
        toast.success("Progress update posted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="photo">Site photo</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" required />
      </div>
      <div className="flex-1 space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <Input id="caption" name="caption" placeholder="What's happening on site?" />
      </div>
      <Button type="submit" disabled={pending}>
        <UploadIcon className="size-4" />
        {pending ? "Posting..." : "Post update"}
      </Button>
    </form>
  );
}
