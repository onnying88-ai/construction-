"use server";

import { createWorker } from "tesseract.js";
import os from "node:os";
import { requireUser } from "@/lib/actions/helpers";
import { uploadFile } from "@/lib/storage";
import { extractAmount, extractTax, extractDate, guessCategory } from "@/lib/invoice-parse";

export type ScanResult = {
  rawText: string;
  guessedAmount: number | null;
  guessedTax: number | null;
  guessedDate: string | null;
  guessedCategory: string;
  photoUrl: string;
  photoFileName: string;
};

export async function scanInvoice(projectId: string, formData: FormData): Promise<ScanResult> {
  await requireUser();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a photo of the invoice.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a photo (JPG/PNG) of the invoice, not a PDF.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Photo must be under 15MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Vercel's deployment filesystem is read-only outside /tmp — point
  // tesseract's on-disk language-data cache at the OS temp dir explicitly
  // so it doesn't try (and fail) to write into the project directory.
  // (`dataPath` is a virtual path inside tesseract's WASM filesystem, not
  // a real disk path — leave it at its default.)
  const worker = await createWorker("eng", undefined, {
    cachePath: os.tmpdir(),
  });
  let text: string;
  try {
    const { data } = await worker.recognize(buffer);
    text = data.text;
  } finally {
    await worker.terminate();
  }

  const { url, fileName } = await uploadFile(file, `${projectId}/costing`);

  // The most reliable number OCR finds is the invoice's grand total (tax
  // included). If a separate tax line is also found, split it out so
  // "Amount" pre-fills as the subtotal and "Tax" pre-fills on its own —
  // otherwise put the whole total in Amount and leave Tax for the user.
  const guessedTotal = extractAmount(text);
  const guessedTax = extractTax(text);
  const guessedAmount =
    guessedTotal !== null && guessedTax !== null ? guessedTotal - guessedTax : guessedTotal;

  return {
    rawText: text,
    guessedAmount,
    guessedTax,
    guessedDate: extractDate(text),
    guessedCategory: guessCategory(text),
    photoUrl: url,
    photoFileName: fileName,
  };
}
