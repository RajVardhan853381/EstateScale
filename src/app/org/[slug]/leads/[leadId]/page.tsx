import { getLead } from "@/lib/services/leads";
import { listLeadActivities } from "@/lib/services/activities";
import { prisma } from "@/lib/prisma";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadActivityTimeline } from "@/components/crm/LeadActivityTimeline";
import { AiLeadAssessment } from "@/components/crm/AiLeadAssessment";
import { ConversationThread } from "@/components/crm/ConversationThread";
import { notFound } from "next/navigation";

export default async function LeadDetailPage(props: {
  params: Promise<{ slug: string; leadId: string }>;
}) {
  const params = await props.params;
  let lead: Awaited<ReturnType<typeof getLead>>;
  let activities: Awaited<ReturnType<typeof listLeadActivities>>;
  let messages: { id: string; body: string; direction: "INBOUND" | "OUTBOUND"; status: string; createdAt: Date; }[] = [];
  let isOptedOut = false;

  try {
    const { organization } = await requireOrganizationMember(params.slug);
    lead = await getLead(params.slug, params.leadId);
    activities = await listLeadActivities(params.slug, params.leadId);

    const conversation = await prisma.conversation.findFirst({
        where: { organizationId: organization.id, leadId: lead.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (conversation) {
        messages = conversation.messages;
        isOptedOut = conversation.status === "OPT_OUT";
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("signin") || msg.includes("NEXT_REDIRECT")) {
        throw error;
    }
    notFound();
  }

  return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {lead.contact?.firstName} {lead.contact?.lastName}
            </h1>
            <Badge variant="outline" className="text-lg py-1 px-4">{lead.status}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

                <AiLeadAssessment
                    slug={params.slug}
                    leadId={lead.id}
                    assessment={lead.aiAssessments?.[0]}
                />

                <ConversationThread
                    organizationSlug={params.slug}
                    leadId={lead.id}
                    messages={messages}
                    isOptedOut={isOptedOut}
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Lead Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-gray-500">Email</div>
                                <div>{lead.contact?.email || "-"}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Phone</div>
                                <div>{lead.contact?.phone || "-"}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Source</div>
                                <div>{lead.source || "-"}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Budget</div>
                                <div>{lead.budget ? `$${lead.budget.toLocaleString()}` : "-"}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Location</div>
                                <div>{lead.location || "-"}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Property Type</div>
                                <div>{lead.propertyType || "-"}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lead.notes.length === 0 ? (
                            <div className="text-gray-500 text-sm">No notes added.</div>
                        ) : (
                            <div className="space-y-4">
                                {lead.notes.map(note => (
                                    <div key={note.id} className="p-3 bg-gray-50 rounded text-sm">
                                        <div className="text-gray-600 mb-1 font-semibold">{note.user?.user?.name || "System"}</div>
                                        <div>{note.content}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pipeline & Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <div className="text-gray-500">Assigned Agent</div>
                            <div className="font-medium">{lead.assignedUser?.user?.name || "Unassigned"}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Pipeline</div>
                            <div className="font-medium">{lead.pipeline?.name || "-"}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Stage</div>
                            <div className="font-medium">{lead.pipelineStage?.name || "-"}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {lead.tags.map(t => (
                                <Badge key={t.tag.id} variant="secondary">{t.tag.name}</Badge>
                            ))}
                            {lead.tags.length === 0 && <span className="text-gray-500 text-sm">No tags.</span>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LeadActivityTimeline activities={activities} />
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
  );
}
