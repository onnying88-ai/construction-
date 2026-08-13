import { put, del } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function hasBlobToken() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function uploadFile(
  file: File,
  pathPrefix: string
): Promise<{ url: string; fileName: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${pathPrefix}/${crypto.randomUUID()}-${safeName}`;

  if (hasBlobToken()) {
    const blob = await put(key, file, { access: "public" });
    return { url: blob.url, fileName: file.name };
  }

  await fs.mkdir(path.join(LOCAL_UPLOAD_DIR, pathPrefix), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const localPath = path.join(LOCAL_UPLOAD_DIR, key);
  await fs.writeFile(localPath, buffer);
  return { url: `/uploads/${key}`, fileName: file.name };
}

export async function deleteFile(url: string): Promise<void> {
  if (hasBlobToken() && url.includes("blob.vercel-storage.com")) {
    await del(url).catch(() => {});
    return;
  }
  if (url.startsWith("/uploads/")) {
    const localPath = path.join(LOCAL_UPLOAD_DIR, url.replace("/uploads/", ""));
    await fs.unlink(localPath).catch(() => {});
  }
}
