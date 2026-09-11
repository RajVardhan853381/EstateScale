import { requireOrganizationMember } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default async function ContactsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const contacts = await prisma.contact.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
        _count: {
            select: { leads: true }
        }
    }
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Contacts Master List</h1>
        <p className="mt-2 text-gray-600">View all individual contacts across your organization.</p>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader>
           <CardTitle>Directory</CardTitle>
           <CardDescription>Recent 100 contacts.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 overflow-x-auto">
           {contacts.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-center border rounded-md bg-gray-50/50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Contacts Found</h3>
                  <p className="text-gray-500 text-sm">Contacts are created automatically when leads are imported or added.</p>
               </div>
           ) : (
               <div className="rounded-md border overflow-x-auto">
                   <Table className="min-w-[600px]">
                       <TableHeader>
                           <TableRow>
                               <TableHead>Name</TableHead>
                               <TableHead>Email</TableHead>
                               <TableHead>Phone</TableHead>
                               <TableHead>Leads</TableHead>
                               <TableHead>Created</TableHead>
                           </TableRow>
                       </TableHeader>
                       <TableBody>
                           {contacts.map(c => (
                               <TableRow key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                   <TableCell className="font-medium text-gray-900">{c.firstName} {c.lastName}</TableCell>
                                   <TableCell className="text-gray-600">{c.email || "-"}</TableCell>
                                   <TableCell className="text-gray-600">{c.phone || "-"}</TableCell>
                                   <TableCell>
                                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                           {c._count.leads}
                                       </span>
                                   </TableCell>
                                   <TableCell className="text-gray-500 text-sm">{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                               </TableRow>
                           ))}
                       </TableBody>
                   </Table>
               </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
