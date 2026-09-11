import { requireOrganizationMember } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AIAgentsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const agents = await prisma.aIAgent.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Studio</h1>
        <p className="mt-2 text-gray-600">Configure AI Agents to automatically qualify leads and follow up.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map(agent => (
              <Card key={agent.id} className={agent.status === "ACTIVE" ? 'border-blue-200 ring-1 ring-blue-500' : 'border-gray-200'}>
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <Badge variant={agent.status === "ACTIVE" ? "default" : "secondary"}>
                              {agent.status}
                          </Badge>
                      </div>
                      <CardDescription>{agent.description || "No description provided."}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between border-b pb-2">
                          <span className="text-gray-500 font-medium">Type</span>
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{agent.agentType}</span>
                      </div>
                      <div className="pt-2">
                          <span className="text-gray-500 font-medium block mb-2">Allowed Tools</span>
                          <div className="flex flex-wrap gap-1">
                              {(agent.allowedTools as string[] || []).map(tool => (
                                  <Badge key={tool} variant="outline" className="text-[10px]">{tool}</Badge>
                              ))}
                              {(!agent.allowedTools || (agent.allowedTools as string[]).length === 0) && <span className="text-xs text-gray-400">None configured</span>}
                          </div>
                      </div>
                  </CardContent>
              </Card>
          ))}

          {agents.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border rounded-md bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Agents Configured</h3>
                  <p className="text-gray-500 text-sm mb-4">You haven&apos;t set up any automated AI workers yet.</p>
              </div>
          )}
      </div>
    </div>
  );
}
