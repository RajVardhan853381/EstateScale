import { getLead } from '@/lib/services/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function LeadDetailPage(props: {
  params: Promise<{ slug: string; leadId: string }>;
}) {
  const params = await props.params;
  await requireOrganizationMember(params.slug);

  const lead = await getLead(params.slug, params.leadId);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {lead.contact?.firstName} {lead.contact?.lastName}
          </h1>
          <p className="text-gray-500 mt-1">{lead.contact?.email} • {lead.contact?.phone}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={lead.status === 'NEW' ? 'default' : 'secondary'} className="text-sm">
            {lead.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes ({lead.notesRel.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500 block">Source</span>
                      <span>{lead.source || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Score</span>
                      <span>{lead.score || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Intent</span>
                      <span>{lead.intent || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Budget</span>
                      <span>{lead.budget ? `$${lead.budget.toLocaleString()}` : 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Location</span>
                      <span>{lead.location || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Property Type</span>
                      <span>{lead.propertyType || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Timeline</span>
                      <span>{lead.timeline || 'Unknown'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.notesRel.length === 0 ? (
                    <p className="text-gray-500 text-sm">No notes yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {lead.notesRel.map(note => (
                        <div key={note.id} className="border-b pb-4 last:border-0">
                          <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                          <div className="text-xs text-gray-400 mt-2">
                            {note.user?.user.name} • {new Date(note.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
               <Card>
                <CardHeader>
                  <CardTitle>Activity</CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-gray-500 text-sm italic">Activity timeline loaded separately.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{lead.assignedUser?.user.name || 'Unassigned'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{lead.pipelineStage?.name || 'No Stage'}</p>
              <p className="text-xs text-gray-500 mt-1">{lead.pipeline?.name}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map(lt => (
                  <Badge key={lt.tag.id} variant="outline">{lt.tag.name}</Badge>
                ))}
                {lead.tags.length === 0 && <span className="text-sm text-gray-500">No tags</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
