import { prisma } from "@/lib/prisma";
import { deleteProgressUpdate } from "@/lib/actions/progress";
import { formatDate } from "@/lib/format";
import { ProgressUploadForm } from "@/components/progress-upload-form";
import { SendReportButton } from "@/components/send-report-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  const [project, updates] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { clientEmail: true },
    }),
    prisma.progressUpdate.findMany({
      where: { projectId },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProgressUploadForm projectId={projectId} />
        <SendReportButton
          projectId={projectId}
          clientEmail={project.clientEmail}
          updateCount={updates.length}
        />
      </div>

      {updates.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No progress updates yet. Post a site photo to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {updates.map((update) => (
            <Card key={update.id} className="overflow-hidden py-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={update.photoUrl}
                alt={update.caption ?? "Site progress photo"}
                className="aspect-video w-full object-cover"
              />
              <CardContent className="space-y-2 py-4">
                {update.caption && <p className="text-sm">{update.caption}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatDate(update.createdAt)}
                    {update.createdBy?.name ? ` · ${update.createdBy.name}` : ""}
                  </span>
                  <form action={deleteProgressUpdate.bind(null, update.id, projectId)}>
                    <ConfirmSubmitButton
                      variant="ghost"
                      size="sm"
                      confirmMessage="Delete this progress update?"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
