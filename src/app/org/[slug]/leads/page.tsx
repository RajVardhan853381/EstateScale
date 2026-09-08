import { listLeads } from '@/lib/services/leads';
import { LeadTable } from '@/components/crm/LeadTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { requireOrganizationMember } from '@/lib/auth/authorization';

export default async function LeadsPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string; status?: string; stage?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  await requireOrganizationMember(params.slug);

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';

  const data = await listLeads(params.slug, {
    page,
    limit: 20,
    search,
    status: searchParams.status,
    pipelineStageId: searchParams.stage,
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leads</h1>
        <Link href={`/org/${params.slug}/leads/new`}>
          <Button>Create Lead</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <form method="GET" className="flex gap-2">
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search leads..."
                className="border px-3 py-2 rounded text-sm w-64"
              />
              <Button type="submit" variant="secondary">Search</Button>
            </form>
          </div>

          <LeadTable leads={data.leads} organizationSlug={params.slug} />

          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <div>
              Showing page {data.pagination.page} of {data.pagination.totalPages || 1}
            </div>
            <div className="space-x-2">
              {data.pagination.page > 1 && (
                <a
                  href={`/org/${params.slug}/leads?page=${data.pagination.page - 1}`}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  Previous
                </a>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <a
                  href={`/org/${params.slug}/leads?page=${data.pagination.page + 1}`}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
