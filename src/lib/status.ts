type StatusMeta = { label: string; className: string };

const GRAY = "bg-muted text-muted-foreground";
const BLUE = "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
const GREEN = "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
const AMBER = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
const RED = "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";

export const PROJECT_STATUS: Record<string, StatusMeta> = {
  PLANNING: { label: "Planning", className: GRAY },
  IN_PROGRESS: { label: "In Progress", className: BLUE },
  COMPLETED: { label: "Completed", className: GREEN },
  ON_HOLD: { label: "On Hold", className: AMBER },
};

export const SCHEDULE_STATUS: Record<string, StatusMeta> = {
  NOT_STARTED: { label: "Not Started", className: GRAY },
  IN_PROGRESS: { label: "In Progress", className: BLUE },
  DONE: { label: "Done", className: GREEN },
  DELAYED: { label: "Delayed", className: RED },
};

export const QUOTATION_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: "Draft", className: GRAY },
  SENT: { label: "Sent", className: BLUE },
  ACCEPTED: { label: "Accepted", className: GREEN },
  REJECTED: { label: "Rejected", className: RED },
};

export const INVOICE_STATUS: Record<string, StatusMeta> = {
  UNPAID: { label: "Unpaid", className: AMBER },
  PARTIAL: { label: "Partial", className: BLUE },
  PAID: { label: "Paid", className: GREEN },
  OVERDUE: { label: "Overdue", className: RED },
};

export const CONTRACT_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: "Draft", className: GRAY },
  PENDING_SIGNATURE: { label: "Pending Signature", className: AMBER },
  SIGNED: { label: "Signed", className: GREEN },
  EXPIRED: { label: "Expired", className: RED },
};

export const PERMIT_STATUS: Record<string, StatusMeta> = {
  NOT_STARTED: { label: "Not Started", className: GRAY },
  SUBMITTED: { label: "Submitted", className: BLUE },
  APPROVED: { label: "Approved", className: GREEN },
  REJECTED: { label: "Rejected", className: RED },
  EXPIRED: { label: "Expired", className: RED },
};

export const MAINTENANCE_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: "Pending", className: AMBER },
  SCHEDULED: { label: "Scheduled", className: BLUE },
  IN_PROGRESS: { label: "In Progress", className: BLUE },
  COMPLETED: { label: "Completed", className: GREEN },
};

export const MAINTENANCE_PRIORITY: Record<string, StatusMeta> = {
  LOW: { label: "Low", className: GRAY },
  MEDIUM: { label: "Medium", className: BLUE },
  HIGH: { label: "High", className: AMBER },
  URGENT: { label: "Urgent", className: RED },
};

export const COST_TYPE: Record<string, StatusMeta> = {
  BUDGET: { label: "Budget", className: GRAY },
  ACTUAL: { label: "Actual", className: BLUE },
};

export function statusMeta(map: Record<string, StatusMeta>, key: string): StatusMeta {
  return map[key] ?? { label: key, className: GRAY };
}
