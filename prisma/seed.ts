import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "onnying88@gmail.com";
const ADMIN_TEMP_PASSWORD = "ChangeMe123!";

const EXCLUDE_PATTERN = /contract|application|refit|detail|video|insurance/i;
const INCLUDE_PATTERN = /top\s*toy/i;

function findProjectFolders(): string[] {
  const rootDir = path.join(__dirname, "..", "..");
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => INCLUDE_PATTERN.test(name) && !EXCLUDE_PATTERN.test(name));
}

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(ADMIN_TEMP_PASSWORD, 10);
    await prisma.user.create({
      data: {
        name: "Chee Onn",
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Created admin user ${ADMIN_EMAIL} with temporary password: ${ADMIN_TEMP_PASSWORD}`);
  } else {
    console.log(`Admin user ${ADMIN_EMAIL} already exists, skipping.`);
  }

  const folders = findProjectFolders();
  console.log(`Found ${folders.length} candidate project folders.`);

  for (const folder of folders) {
    const existing = await prisma.project.findFirst({ where: { name: folder } });
    if (existing) {
      console.log(`Skipping existing project: ${folder}`);
      continue;
    }
    await prisma.project.create({
      data: {
        name: folder,
        location: folder.replace(/^top\s*toy\s*/i, "").trim() || folder,
        status: "PLANNING",
      },
    });
    console.log(`Created project: ${folder}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
