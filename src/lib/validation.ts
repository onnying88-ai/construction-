import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const optionalDate = z.preprocess(emptyToUndef, z.coerce.date().optional());
export const requiredDate = z.preprocess(emptyToUndef, z.coerce.date());
export const optionalString = z.preprocess(emptyToUndef, z.string().optional());
export const requiredString = z.string().min(1, "Required");
export const requiredAmount = z.coerce.number().min(0, "Must be 0 or more");
export const optionalAmount = z.preprocess(
  emptyToUndef,
  z.coerce.number().min(0).optional()
);

export const projectSchema = z.object({
  name: requiredString,
  location: optionalString,
  status: z.enum(["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]),
  address: optionalString,
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalString,
});

export const scheduleItemSchema = z.object({
  title: requiredString,
  description: optionalString,
  startDate: optionalDate,
  endDate: optionalDate,
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "DONE", "DELAYED"]),
});

export const costEntrySchema = z.object({
  category: requiredString,
  description: optionalString,
  type: z.enum(["BUDGET", "ACTUAL"]),
  amount: requiredAmount,
  date: requiredDate,
});

export const quotationSchema = z.object({
  quotationNo: requiredString,
  title: requiredString,
  amount: requiredAmount,
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]),
  issueDate: optionalDate,
  validUntil: optionalDate,
});

export const invoiceSchema = z.object({
  invoiceNo: requiredString,
  amount: requiredAmount,
  status: z.enum(["UNPAID", "PARTIAL", "PAID", "OVERDUE"]),
  issueDate: optionalDate,
  dueDate: optionalDate,
  paidDate: optionalDate,
});

export const contractSchema = z.object({
  contractNo: optionalString,
  title: requiredString,
  counterparty: optionalString,
  value: optionalAmount,
  signDate: optionalDate,
  status: z.enum(["DRAFT", "PENDING_SIGNATURE", "SIGNED", "EXPIRED"]),
});

export const drawingSchema = z.object({
  title: requiredString,
  discipline: optionalString,
  revision: optionalString,
  uploadDate: optionalDate,
});

export const permitSchema = z.object({
  permitType: requiredString,
  permitNo: optionalString,
  status: z.enum(["NOT_STARTED", "SUBMITTED", "APPROVED", "REJECTED", "EXPIRED"]),
  submittedDate: optionalDate,
  approvedDate: optionalDate,
  expiryDate: optionalDate,
});

export const maintenanceSchema = z.object({
  title: requiredString,
  description: optionalString,
  status: z.enum(["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: optionalDate,
  completedDate: optionalDate,
});
