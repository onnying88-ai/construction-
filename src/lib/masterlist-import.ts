import ExcelJS from "exceljs";

/**
 * Parses the "REFIT Project Master List / P&L" workbook and turns it into
 * per-project records for the app. Pure logic (no DB) so it can be tested
 * against the real file; see src/lib/actions/masterlist.ts for the DB side.
 *
 * Only the *input* registers are read (Master P&L inputs, Quotation Register,
 * Direct Costs, Payments Received). Totals/GP are recomputed by the app's own
 * P&L page, so cached formula results in the workbook are never trusted.
 */

const SST_RATE = 0.06;
const CODE_PATTERN = /^[A-Z0-9]{2,}(-[A-Z0-9]+)+$/;

export type ProjectStatusValue = "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
export type QuotationStatusValue = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
export type InvoiceStatusValue = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";

export type PlannedQuotation = {
  quotationNo: string;
  title: string;
  amount: number;
  taxAmount: number;
  status: QuotationStatusValue;
  issueDate: string | null;
};

export type PlannedCost = {
  category: string;
  description: string;
  type: "BUDGET" | "ACTUAL";
  amount: number;
  taxAmount: number;
  date: string;
};

export type PlannedInvoice = {
  invoiceNo: string;
  amount: number;
  taxAmount: number;
  status: InvoiceStatusValue;
  issueDate: string | null;
  paidDate: string | null;
};

export type ProjectPlan = {
  code: string;
  client: string;
  mall: string;
  name: string;
  location: string | null;
  status: ProjectStatusValue;
  notes: string;
  quotations: PlannedQuotation[];
  costs: PlannedCost[];
  invoices: PlannedInvoice[];
  totals: { revenue: number; cost: number; billed: number; received: number; outstanding: number };
};

export type MasterlistPlan = {
  projects: ProjectPlan[];
  warnings: string[];
};

type Cell = string | number | null;
type Row = Record<string, Cell>;

function cellValue(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return cellValue(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text);
    return null; // formula without a cached result — never trusted
  }
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (typeof v === "number") return v;
  return null;
}

/** Reads a sheet as objects keyed by the header row (the row whose first cell is `firstHeader`). */
function readTable(ws: ExcelJS.Worksheet | undefined, firstHeader: string, headerCol = 1): Row[] {
  if (!ws) return [];
  let headerRowNo = 0;
  ws.eachRow((row, n) => {
    if (!headerRowNo && cellValue(row.getCell(headerCol).value) === firstHeader) headerRowNo = n;
  });
  if (!headerRowNo) return [];
  const headers: string[] = [];
  ws.getRow(headerRowNo).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cellValue(cell.value) ?? "");
  });
  const rows: Row[] = [];
  ws.eachRow((row, n) => {
    if (n <= headerRowNo) return;
    const obj: Row = {};
    let any = false;
    for (let col = 1; col < headers.length; col++) {
      if (!headers[col]) continue;
      const v = cellValue(row.getCell(col).value);
      obj[headers[col]] = v;
      if (v !== null) any = true;
    }
    if (any) rows.push(obj);
  });
  return rows;
}

const str = (v: Cell): string => (v === null ? "" : String(v).trim());
const num = (v: Cell): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[, ]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const date = (v: Cell): string | null => {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

function mapStatus(s: string): ProjectStatusValue {
  const v = s.toLowerCase();
  if (v === "completed") return "COMPLETED";
  if (v === "cancelled") return "ON_HOLD"; // app has no "cancelled"; noted in project notes
  if (v === "to confirm") return "PLANNING";
  return "IN_PROGRESS";
}

export async function parseMasterlist(data: ArrayBuffer | Buffer): Promise<MasterlistPlan> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as ArrayBuffer);

  const master = readTable(wb.getWorksheet("Master P&L"), "No");
  const register = readTable(wb.getWorksheet("Quotation Register"), "No");
  const direct = readTable(wb.getWorksheet("Direct Costs"), "No");
  const payments = readTable(wb.getWorksheet("Payments Received"), "No");

  const warnings: string[] = [];
  if (!master.length) {
    throw new Error(
      "Couldn't find the 'Master P&L' sheet. Please upload the REFIT Project Master List workbook."
    );
  }

  const byCode = <T extends Row>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) {
      const code = str(r["Project Code"]);
      if (!code) continue;
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(r);
    }
    return map;
  };
  const registerBy = byCode(register);
  const directBy = byCode(direct);
  const paymentsBy = byCode(payments);

  const projects: ProjectPlan[] = [];

  for (const m of master) {
    const code = str(m["Project Code"]);
    if (!CODE_PATTERN.test(code)) continue; // totals / footnote rows

    const client = str(m["Client / Brand"]);
    const outletName = str(m["Outlet"]) || code;
    const mall = str(m["Mall / Location"]);
    const state = str(m["State"]);
    const sheetStatus = str(m["Status"]);
    const cancelled = sheetStatus.toLowerCase() === "cancelled";
    const status = mapStatus(sheetStatus);
    const quoteDate = date(m["Client Quote Date"]);
    const area = num(m["Area (sqft)"]);
    const remarks = str(m["Remarks"]);
    const inPaymentList = str(m["In Your Payment Masterlist? (Y/N)"]).toUpperCase() === "Y";
    const manualRefit = m["Refit Cost – MANUAL ENTRY (RM)"];
    const contractSum = num(m["Contract Sum (RM)"]);
    const docs = registerBy.get(code) ?? [];
    const fallbackDate = quoteDate ?? date(docs.find((d) => date(d["Doc Date"]))?.["Doc Date"] ?? null) ?? new Date().toISOString().slice(0, 10);

    const location =
      [mall, state].filter((p) => p && p !== "-" && p.toLowerCase() !== "various").join(", ") || null;

    const quotationStatus: QuotationStatusValue = cancelled ? "REJECTED" : status === "PLANNING" ? "SENT" : "ACCEPTED";

    // ---- Quotations (revenue side): Client Quote + VO Claim ----
    const quotations: PlannedQuotation[] = [];
    let q = 0;
    let vo = 0;
    for (const d of docs) {
      const type = str(d["Doc Type"]);
      if (type !== "Client Quote" && type !== "VO Claim") continue;
      const amount = num(d["Amount excl. SST (RM)"]);
      const sst = str(d["SST Charged? (Y/N)"]).toUpperCase() === "Y";
      const tax = sst ? round2(num(d["SST 6% (RM)"]) || amount * SST_RATE) : 0;
      const fileName = str(d["Document / File Name"]).replace(/\.xlsx?$/i, "");
      const isVo = type === "VO Claim";
      quotations.push({
        quotationNo: isVo ? `${code}-VO${++vo}` : `${code}-Q${++q}`,
        title: fileName || (isVo ? "Variation order claim" : "Client quotation"),
        amount,
        taxAmount: tax,
        status: quotationStatus,
        issueDate: date(d["Doc Date"]),
      });
    }
    if (!quotations.some((x) => x.quotationNo.includes("-Q")) && contractSum > 0) {
      quotations.unshift({
        quotationNo: `${code}-Q1`,
        title: "Contract sum per masterlist",
        amount: contractSum,
        taxAmount: 0,
        status: quotationStatus,
        issueDate: quoteDate,
      });
    }

    // ---- Costs ----
    const costs: PlannedCost[] = [];
    if (!cancelled) {
      const refitRows = docs.filter((d) => str(d["Doc Type"]) === "Refit Cost");
      if (typeof manualRefit === "number" && manualRefit > 0) {
        costs.push({
          category: "Refit contractor",
          description: "Refit cost (manual entry in masterlist)",
          type: "ACTUAL",
          amount: manualRefit,
          taxAmount: 0,
          date: fallbackDate,
        });
      } else {
        for (const d of refitRows) {
          costs.push({
            category: "Refit contractor",
            description: str(d["Document / File Name"]).replace(/\.xlsx?$/i, "") || "Refit cost",
            type: "ACTUAL",
            amount: num(d["Amount excl. SST (RM)"]),
            taxAmount: 0,
            date: date(d["Doc Date"]) ?? fallbackDate,
          });
        }
      }
      for (const d of docs.filter((x) => str(x["Doc Type"]) === "VO Cost")) {
        costs.push({
          category: "VO cost",
          description: str(d["Document / File Name"]).replace(/\.xlsx?$/i, "") || "Variation order cost",
          type: "ACTUAL",
          amount: num(d["Amount excl. SST (RM)"]),
          taxAmount: 0,
          date: date(d["Doc Date"]) ?? fallbackDate,
        });
      }
      for (const d of docs.filter((x) => str(x["Doc Type"]) === "Refit BQ (ref)")) {
        costs.push({
          category: "Refit BQ (reference)",
          description: str(d["Document / File Name"]).replace(/\.xlsx?$/i, "") || "Refit BQ",
          type: "BUDGET",
          amount: num(d["Amount excl. SST (RM)"]),
          taxAmount: 0,
          date: date(d["Doc Date"]) ?? fallbackDate,
        });
      }
      for (const d of directBy.get(code) ?? []) {
        if (str(d["Include in Cost? (Y/N)"]).toUpperCase() !== "Y") continue;
        const amount = num(d["Amount (RM)"]);
        if (!amount) continue;
        costs.push({
          category: "Direct supplier cost",
          description: str(d["Supplier / Payee"]) || "Supplier",
          type: "ACTUAL",
          amount,
          taxAmount: 0,
          date: fallbackDate, // the masterlist has no date for these
        });
      }
    }

    // ---- Invoices: payments received + outstanding balance ----
    const invoices: PlannedInvoice[] = [];
    const revenueQuotes = cancelled ? [] : quotations;
    const billable = revenueQuotes.reduce((s, x) => s + x.amount + x.taxAmount, 0);
    const hasSst = revenueQuotes.some((x) => x.taxAmount > 0);
    const split = (gross: number) => {
      if (!hasSst) return { amount: round2(gross), taxAmount: 0 };
      const amount = round2(gross / (1 + SST_RATE));
      return { amount, taxAmount: round2(gross - amount) };
    };
    let received = 0;
    if (!cancelled) {
      let n = 0;
      for (const p of paymentsBy.get(code) ?? []) {
        const gross = num(p["Amount (RM)"]);
        if (!gross) continue;
        received += gross;
        const d = date(p["Date Received"]);
        invoices.push({
          invoiceNo: `${code}-PMT${++n}`,
          ...split(gross),
          status: "PAID",
          issueDate: d,
          paidDate: d,
        });
      }
      const outstanding = round2(billable - received);
      // Only when the project is tracked in the payment masterlist — otherwise
      // "no payments" means "unknown", not "unpaid".
      if (inPaymentList && outstanding > 0.5) {
        invoices.push({ invoiceNo: `${code}-BAL`, ...split(outstanding), status: "UNPAID", issueDate: null, paidDate: null });
      }
    }

    const missingRefit =
      !cancelled && quotations.length > 0 && !costs.some((c) => c.category === "Refit contractor" || c.category === "VO cost");

    const notes = [
      `Code: ${code}`,
      client && `Client: ${client}`,
      area > 0 && `Area: ${area.toLocaleString("en-US")} sqft`,
      sheetStatus && `Masterlist status: ${sheetStatus}${cancelled ? " (no cancelled status in app — set to On Hold)" : ""}`,
      missingRefit && "⚠ Refit cost not in masterlist yet — profit looks inflated until it is entered under Costing.",
      remarks,
    ]
      .filter(Boolean)
      .join("\n");

    const revenue = revenueQuotes.reduce((s, x) => s + x.amount, 0);
    const cost = costs.filter((c) => c.type === "ACTUAL").reduce((s, c) => s + c.amount + c.taxAmount, 0);
    projects.push({
      code,
      client,
      mall,
      name: outletName,
      location,
      status,
      notes,
      quotations,
      costs,
      invoices,
      totals: {
        revenue: round2(revenue),
        cost: round2(cost),
        billed: round2(billable),
        received: round2(received),
        outstanding: round2(invoices.filter((i) => i.status === "UNPAID").reduce((s, i) => s + i.amount + i.taxAmount, 0)),
      },
    });
  }

  // Register rows pointing at a project that isn't in the Master P&L would be silently lost.
  const known = new Set(projects.map((p) => p.code));
  for (const [label, map] of [
    ["Quotation Register", registerBy],
    ["Direct Costs", directBy],
    ["Payments Received", paymentsBy],
  ] as const) {
    for (const code of map.keys()) {
      if (!known.has(code)) warnings.push(`${label}: rows for unknown project code "${code}" were skipped.`);
    }
  }
  const noCode = [...payments, ...direct].filter((r) => !str(r["Project Code"]) && num(r["Amount (RM)"]) > 0).length;
  if (noCode) warnings.push(`${noCode} payment/cost row(s) have no project code and were skipped.`);

  return { projects, warnings };
}

/** Suggests an existing app project that probably is the same outlet (brand + mall keyword both in its name). */
export function suggestMatch(
  plan: Pick<ProjectPlan, "code" | "client" | "mall">,
  existing: { id: string; name: string; notes: string | null }[]
): string | null {
  const byCode = existing.find((e) => e.notes?.startsWith(`Code: ${plan.code}`));
  if (byCode) return byCode.id;
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["mall", "city", "the", "lot", "sdn", "bhd"].includes(w));
  const brand = words(plan.client);
  const place = words(plan.mall);
  if (!brand.length || !place.length) return null;
  const hit = existing.find((e) => {
    const name = words(e.name);
    const has = (w: string) => name.some((n) => n.startsWith(w.slice(0, 5)) || w.startsWith(n.slice(0, 5)));
    return brand.every(has) && place.every(has);
  });
  return hit?.id ?? null;
}
