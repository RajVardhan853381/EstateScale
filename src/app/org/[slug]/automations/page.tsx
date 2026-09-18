import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default async function AutomationsPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const automations = await prisma.automation.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' }
  });

  const recentExecutions = await prisma.automationExecution.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
          automation: true,
          lead: { include: { contact: true } }
      }
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Automation Engine</h1>
        <p className="mt-2 text-gray-600">Configure background workflows and view recent execution histories.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {automations.map(auto => (
              <Card key={auto.id} className={auto.enabled ? 'border-green-200' : 'border-gray-200'}>
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{auto.name}</CardTitle>
                          <Badge variant={auto.enabled ? "default" : "secondary"}>
                              {auto.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                      </div>
                      <CardDescription>{auto.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between border-b pb-2">
                          <span className="text-gray-500 font-medium">Trigger</span>
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{auto.triggerType}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                          <span className="text-gray-500 font-medium">Action</span>
                          <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{auto.actionType}</span>
                      </div>
                  </CardContent>
              </Card>
          ))}

          {automations.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500 border border-dashed rounded-lg">
                  No automations configured for this organization yet.
              </div>
          )}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>The last 50 automation jobs processed by the background engine.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Execution ID</TableHead>
                        <TableHead>Automation</TableHead>
                        <TableHead>Target Lead</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentExecutions.map(exec => (
                        <TableRow key={exec.id}>
                            <TableCell className="font-mono text-xs text-gray-500">
                                {exec.id.split('-')[0]}...
                            </TableCell>
                            <TableCell className="font-medium">
                                {exec.automation.name}
                            </TableCell>
                            <TableCell>
                                {exec.lead.contact?.firstName} {exec.lead.contact?.lastName}
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                    exec.status === "COMPLETED" ? "default" :
                                    exec.status === "FAILED" ? "destructive" : "secondary"
                                }>
                                    {exec.status}
                                </Badge>
                                {exec.error && <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={exec.error}>{exec.error}</p>}
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm">
                                {format(new Date(exec.createdAt), 'MMM d, h:mm a')}
                            </TableCell>
                        </TableRow>
                    ))}
                    {recentExecutions.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center p-8 text-gray-500">
                                No execution history found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
