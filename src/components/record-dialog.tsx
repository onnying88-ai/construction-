"use client";

import { useState, useTransition, isValidElement, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function RecordDialog({
  trigger,
  title,
  action,
  children,
}: {
  trigger: ReactNode;
  title: string;
  action: (formData: FormData) => Promise<unknown>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
        setOpen(false);
        toast.success("Saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // Cloning a <Button> element through Base UI's `render` prop causes a
  // hydration mismatch (Base UI's SSR vs. client merge of the nested
  // component's own `data-slot`/props diverge). DialogTrigger renders a
  // native <button> by default, so style it directly instead of composing
  // through the Button component.
  let triggerChildren: ReactNode = trigger;
  let variantProps: ButtonVariantProps = {};
  let triggerClassName: string | undefined;
  if (isValidElement<{ children?: ReactNode; variant?: ButtonVariantProps["variant"]; size?: ButtonVariantProps["size"]; className?: string }>(trigger)) {
    triggerChildren = trigger.props.children;
    variantProps = { variant: trigger.props.variant, size: trigger.props.size };
    triggerClassName = trigger.props.className;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants(variantProps), triggerClassName)}>
        {triggerChildren}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {children}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
