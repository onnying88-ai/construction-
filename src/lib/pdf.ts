import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import fs from "node:fs/promises";
import path from "node:path";
import { formatDate } from "@/lib/format";

type ProgressUpdateForPdf = {
  photoUrl: string;
  caption: string | null;
  createdAt: Date;
  createdBy: { name: string } | null;
};

async function readPhotoBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("/uploads/")) {
    const localPath = path.join(process.cwd(), "public", url);
    return fs.readFile(localPath);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch photo: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function embedPhoto(pdfDoc: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  try {
    return await pdfDoc.embedJpg(bytes);
  } catch {
    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      return null;
    }
  }
}

export async function generateProgressReportPdf(
  projectName: string,
  updates: ProgressUpdateForPdf[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  page.drawText(projectName, { x: margin, y, size: 20, font: boldFont });
  y -= 24;
  page.drawText(`Progress Report — ${formatDate(new Date())}`, {
    x: margin,
    y,
    size: 11,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 30;

  for (const update of updates) {
    const bytes = await readPhotoBytes(update.photoUrl);
    const image = await embedPhoto(pdfDoc, bytes);

    const maxImgWidth = pageWidth - margin * 2;
    const maxImgHeight = 260;
    let imgWidth = maxImgWidth;
    let imgHeight = 0;
    if (image) {
      const scale = Math.min(maxImgWidth / image.width, maxImgHeight / image.height);
      imgWidth = image.width * scale;
      imgHeight = image.height * scale;
    }

    const captionLines = update.caption ? wrapText(update.caption, font, 11, maxImgWidth) : [];
    const blockHeight = imgHeight + 20 + captionLines.length * 14 + 30;

    if (y - blockHeight < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    if (image) {
      page.drawImage(image, { x: margin, y: y - imgHeight, width: imgWidth, height: imgHeight });
      y -= imgHeight + 8;
    }

    const meta = `${formatDate(update.createdAt)}${update.createdBy ? ` · ${update.createdBy.name}` : ""}`;
    page.drawText(meta, { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
    y -= 16;

    for (const line of captionLines) {
      page.drawText(line, { x: margin, y, size: 11, font });
      y -= 14;
    }

    y -= 20;
  }

  return pdfDoc.save();
}

function wrapText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
