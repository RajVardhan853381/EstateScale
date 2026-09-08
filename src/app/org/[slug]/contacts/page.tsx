import { listContacts } from '@/lib/services/contacts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function ContactsPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  await requireOrganizationMember(params.slug);

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const data = await listContacts(params.slug, { page, limit: 20 });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Contacts</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No contacts found.
                  </TableCell>
                </TableRow>
              ) : (
                data.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.phone || '-'}</TableCell>
                    <TableCell>{contact._count.leads}</TableCell>
                    <TableCell>
                      {contact.leads[0]?.updatedAt
                        ? new Date(contact.leads[0].updatedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <div>
              Showing page {data.pagination.page} of {data.pagination.totalPages || 1}
            </div>
            <div className="space-x-2">
              {data.pagination.page > 1 && (
                <a
                  href={`/org/${params.slug}/contacts?page=${data.pagination.page - 1}`}
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                >
                  Previous
                </a>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <a
                  href={`/org/${params.slug}/contacts?page=${data.pagination.page + 1}`}
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
