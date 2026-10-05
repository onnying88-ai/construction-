import { auth } from "@/lib/auth";
import { AccessDenied } from "@/components/access-denied";
import { ImportMasterlist } from "@/components/import-masterlist";

// The import server action runs on this route; allow time for a hosted database.
export const maxDuration = 60;

export default async function ImportPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return <AccessDenied module="Masterlist import" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Import</h1>
      <ImportMasterlist />
    </div>
  );
}
