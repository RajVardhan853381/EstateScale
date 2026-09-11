import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default async function VoicePage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const { organization } = await requireOrganizationMember(params.slug);

    const [agents, recentCalls] = await prisma.$transaction([
        prisma.voiceAgent.findMany({
            where: { organizationId: organization.id }
        }),
        prisma.voiceCall.findMany({
            where: { organizationId: organization.id },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { lead: { include: { contact: true } } }
        })
    ]);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Voice AI</h1>
                <p className="mt-2 text-gray-600">Manage your virtual voice agents and view call history.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map(agent => (
                    <Card key={agent.id} className={agent.enabled ? 'border-blue-200 shadow-md ring-1 ring-blue-500' : 'border-gray-200'}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{agent.name}</CardTitle>
                                <Badge variant={agent.enabled ? "default" : "secondary"}>
                                    {agent.enabled ? "Active" : "Disabled"}
                                </Badge>
                            </div>
                            <CardDescription>Limit: {agent.callLimitMins} mins/call</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500 font-medium">Greeting</span>
                                <span className="text-xs truncate max-w-[150px]" title={agent.greeting || ""}>
                                    {agent.greeting || "Default"}
                                </span>
                            </div>
                            <div className="flex justify-between pt-2">
                                <span className="text-gray-500 font-medium">Recording</span>
                                <span className="text-xs">{agent.recordCalls ? "Yes" : "No"}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {agents.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border rounded-md bg-white shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Voice Agents</h3>
                        <p className="text-gray-500 text-sm">You haven&apos;t configured a Voice AI agent yet. Please contact support to provision a number.</p>
                    </div>
                )}
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Call History</CardTitle>
                    <CardDescription>Recent inbound and outbound AI voice calls.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 overflow-x-auto">
                    {recentCalls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-md bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Calls Found</h3>
                            <p className="text-gray-500 text-sm">Call history will appear here once the agent interacts with leads.</p>
                        </div>
                    ) : (
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Direction</TableHead>
                                    <TableHead>Lead</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Outcome</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentCalls.map(call => (
                                    <TableRow key={call.id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell>
                                            <Badge variant="outline" className={call.direction === "INBOUND" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}>
                                                {call.direction}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">
                                            {call.lead ? `${call.lead.contact?.firstName || ""} ${call.lead.contact?.lastName || ""}` : "Unknown Caller"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={call.status === "COMPLETED" ? "default" : call.status === "FAILED" ? "destructive" : "secondary"}>
                                                {call.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-600 font-mono text-xs">{call.outcome || "-"}</TableCell>
                                        <TableCell className="text-gray-500">{call.duration ? `${call.duration}s` : "-"}</TableCell>
                                        <TableCell className="text-gray-500 text-sm">{format(new Date(call.createdAt), "MMM d, h:mm a")}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
