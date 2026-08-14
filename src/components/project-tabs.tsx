"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/schedule", label: "Schedule" },
  { href: "/progress", label: "Progress" },
  { href: "/costing", label: "Costing" },
  { href: "/pnl", label: "P&L" },
  { href: "/invoices", label: "Invoices" },
  { href: "/contracts", label: "Contracts" },
  { href: "/drawings", label: "Drawings" },
  { href: "/permits", label: "Permits" },
  { href: "/maintenance", label: "Maintenance" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
