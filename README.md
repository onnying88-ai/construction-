# Construction Tracker

A web app for tracking Top Toy fit-out projects: schedule, costing, quotations,
invoices, contracts, design drawings, work permits, and pending maintenance —
one place per project, shared by the team.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4, shadcn/ui)
- PostgreSQL + Prisma
- NextAuth (Auth.js) v5, email/password (credentials)
- Vercel Blob for file attachments (falls back to local disk storage when no
  `BLOB_READ_WRITE_TOKEN` is set, e.g. in local dev)

## Local development

Prerequisites: Node.js 20+, a PostgreSQL database.

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET`
   (generate one with `npx auth secret`). Leave `BLOB_READ_WRITE_TOKEN` empty
   to use local-disk file storage during development.
2. Install dependencies and set up the database:

   ```bash
   npm install
   npx prisma migrate dev
   npm run db:seed
   ```

   The seed script creates one admin user (see console output for the
   temporary password — **change it after first login**) and one project per
   `Top Toy ...` folder found in the parent directory.
3. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Deploying (free tier)

This app is set up to deploy on Vercel with a Neon Postgres database and
Vercel Blob for file storage — all free to start. You'll need to create these
accounts yourself (I can't create accounts on your behalf); once they exist,
share the connection details and I can help wire everything up.

1. **Database — [Neon](https://neon.tech):** create a free Postgres project,
   copy its connection string into `DATABASE_URL`.
2. **File storage — [Vercel Blob](https://vercel.com/docs/storage/vercel-blob):**
   from your Vercel project, add a Blob store and copy the generated
   `BLOB_READ_WRITE_TOKEN`.
3. **Hosting — [Vercel](https://vercel.com):** import this repository (push it
   to GitHub first), set the three environment variables from `.env.example`
   in the Vercel project settings, and deploy.
4. After the first deploy, run the migration and seed against the production
   database once (locally, with `DATABASE_URL` pointed at Neon):

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
5. Log in with the seeded admin account and change the temporary password
   (there's no self-service password change yet — ask to add one, or update
   it directly via `npx prisma studio` in the meantime).

## Adding team members

There's no sign-up page by design (email/password accounts are created
directly). To add a teammate, insert a row into the `User` table with a
bcrypt-hashed password — either via `npx prisma studio` or by asking for a
small script to do it.
