import { requireOrganizationMember } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function MessagesPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { organization } = await requireOrganizationMember(params.slug);

  const recentMessages = await prisma.message.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
        conversation: {
            include: { contact: true }
        }
    }
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Communication History</h1>
        <p className="mt-2 text-gray-600">View recent SMS interactions with your contacts.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
           <CardTitle>Recent Messages</CardTitle>
           <CardDescription>The last 50 inbound and outbound messages.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 overflow-x-auto">
           {recentMessages.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-center border rounded-md bg-gray-50/50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Messages Found</h3>
                  <p className="text-gray-500 text-sm">Your communication activity will appear here once you start sending or receiving SMS.</p>
               </div>
           ) : (
               <div className="space-y-4">
                  {recentMessages.map(msg => (
                     <div key={msg.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex-1 space-y-1">
                           <div className="flex items-center gap-2">
                               <Badge variant={msg.direction === "INBOUND" ? "secondary" : "default"} className={msg.direction === "INBOUND" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}>
                                   {msg.direction}
                               </Badge>
                               <span className="font-medium text-gray-900 text-sm">
                                   {msg.conversation.contact.firstName} {msg.conversation.contact.lastName}
                               </span>
                               <span className="text-xs text-gray-500">
                                   ({msg.direction === "INBOUND" ? msg.from : msg.to})
                               </span>
                           </div>
                           <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">{msg.body}</p>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 text-sm">
                           <span className="text-gray-500">{format(new Date(msg.createdAt), "MMM d, h:mm a")}</span>
                           <Badge variant="outline" className={msg.status === "FAILED" ? "text-red-600 border-red-200" : ""}>
                               {msg.status}
                           </Badge>
                        </div>
                     </div>
                  ))}
               </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
