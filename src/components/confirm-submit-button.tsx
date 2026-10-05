"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/**
 * A button that asks for confirmation in an in-page dialog, then submits the
 * <form> it sits in. (The browser's window.confirm() is silently blocked in
 * installed phone apps / in-app browsers, which made every Delete do nothing.)
 */
export function ConfirmSubmitButton({
  confirmMessage,
  children,
  variant,
  size,
}: ButtonVariantProps & { confirmMessage: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // The dialog renders in a portal outside the <form>, so remember which form to submit.
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({ variant, size })}
        onClick={(e) => {
          formRef.current = e.currentTarget.closest("form");
        }}
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>{confirmMessage}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setOpen(false);
              formRef.current?.requestSubmit();
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
