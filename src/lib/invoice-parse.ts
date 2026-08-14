const TOTAL_KEYWORDS = /(grand total|total amount|amount due|balance due|total due|net total|\btotal\b)/i;
const TAX_KEYWORDS = /(sst\b|service tax|sales tax|\bgst\b|\btax\b)/i;
const CATEGORY_KEYWORDS: { pattern: RegExp; category: string }[] = [
  { pattern: /cement|concrete|sand|aggregate|brick|block/i, category: "Materials" },
  { pattern: /steel|rebar|metal|aluminium|aluminum/i, category: "Materials" },
  { pattern: /timber|plywood|wood/i, category: "Materials" },
  { pattern: /paint|coating/i, category: "Materials" },
  { pattern: /tile|flooring|ceramic/i, category: "Materials" },
  { pattern: /glass|glazing/i, category: "Materials" },
  { pattern: /electric|wiring|cable|conduit/i, category: "Electrical" },
  { pattern: /plumb|pipe|sanitary/i, category: "Plumbing" },
  { pattern: /rental|rent\b|hire\b/i, category: "Equipment Rental" },
  { pattern: /transport|delivery|freight|logistics/i, category: "Transport" },
  { pattern: /labou?r|wages|manpower/i, category: "Labour" },
  { pattern: /hardware|tools|screw|nail/i, category: "Hardware" },
];

function parseAmountToken(token: string): number | null {
  const cleaned = token.replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

const CURRENCY_PATTERN = /(?:RM|MYR|\$)?\s?[\d,]+\.\d{2}/g;

function amountOnLine(line: string): number | null {
  const matches = line.match(CURRENCY_PATTERN);
  if (!matches || matches.length === 0) return null;
  const amount = parseAmountToken(matches[matches.length - 1]);
  return amount !== null && amount > 0 ? amount : null;
}

export function extractAmount(text: string): number | null {
  const lines = text.split("\n");

  for (const line of lines) {
    if (TOTAL_KEYWORDS.test(line)) {
      const amount = amountOnLine(line);
      if (amount !== null) return amount;
    }
  }

  const allMatches = text.match(CURRENCY_PATTERN);
  if (!allMatches || allMatches.length === 0) return null;
  const amounts = allMatches.map(parseAmountToken).filter((n): n is number => n !== null && n > 0);
  if (amounts.length === 0) return null;
  return Math.max(...amounts);
}

/** Looks for a line mentioning SST/service tax/sales tax/GST and returns the amount on it. */
export function extractTax(text: string): number | null {
  const lines = text.split("\n");
  for (const line of lines) {
    if (TAX_KEYWORDS.test(line) && !TOTAL_KEYWORDS.test(line)) {
      const amount = amountOnLine(line);
      if (amount !== null) return amount;
    }
  }
  return null;
}

const DATE_PATTERNS: { regex: RegExp; parse: (m: RegExpMatchArray) => Date | null }[] = [
  {
    regex: /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/,
    parse: (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  },
  {
    regex: /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
    parse: (m) => new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])),
  },
  {
    regex: /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i,
    parse: (m) => {
      const month = MONTHS.indexOf(m[2].toLowerCase().slice(0, 3));
      return month === -1 ? null : new Date(Number(m[3]), month, Number(m[1]));
    },
  },
];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function extractDate(text: string): string | null {
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 5, 0, 1);
  const maxDate = new Date(now.getFullYear() + 1, 11, 31);

  for (const { regex, parse } of DATE_PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;
    const date = parse(match);
    if (date && !Number.isNaN(date.getTime()) && date >= minDate && date <= maxDate) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

export function guessCategory(text: string): string {
  for (const { pattern, category } of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return "Materials";
}
