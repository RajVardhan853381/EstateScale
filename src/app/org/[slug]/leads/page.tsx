import { listLeads } from "@/lib/services/leads";
import { LeadTable } from "@/components/crm/LeadTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function LeadsPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || "";

  const data = await listLeads(params.slug, {
    page,
    limit: 20,
    search,
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leads</h1>
        <Button>Create Lead</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadTable leads={data.leads} organizationSlug={params.slug} />

          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
             <div>Showing page {data.pagination.page} of {data.pagination.totalPages}</div>
             <div className="space-x-2">
                 {data.pagination.page > 1 && (
                     <a href={`/org/${params.slug}/leads?page=${data.pagination.page - 1}`} className="px-3 py-1 border rounded hover:bg-gray-50">Previous</a>
                 )}
                 {data.pagination.page < data.pagination.totalPages && (
                     <a href={`/org/${params.slug}/leads?page=${data.pagination.page + 1}`} className="px-3 py-1 border rounded hover:bg-gray-50">Next</a>
                 )}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
