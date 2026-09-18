import { requireOrganizationMember } from '@/lib/auth/authorization';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function JourneysDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const membership = await requireOrganizationMember(resolvedParams.slug);

  const journeys = await prisma.journey.findMany({
    where: { organizationId: membership.organization.id },
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Automated Journeys</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Journeys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {journeys.filter((j) => j.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {journeys.reduce((sum, j) => sum + j._count.enrollments, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journey Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journeys.map((journey) => (
              <div
                key={journey.id}
                className="flex justify-between items-center p-4 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{journey.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Trigger: {journey.triggerType} • Status: {journey.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-blue-600">
                    {journey._count.enrollments} Enrolled
                  </div>
                  <div className="text-sm text-muted-foreground">v{journey.version}</div>
                </div>
              </div>
            ))}
            {journeys.length === 0 && (
              <div className="text-muted-foreground">No active journeys configured yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
