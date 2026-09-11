import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { redirect } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminBillingPage() {
    const user = await requireAuthenticatedUser();

    if (user.email !== "superadmin@estatescale.com") {
        redirect("/api/auth/signin");
    }

    const subscriptions = await prisma.subscription.findMany({
        include: { organization: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Admin Billing Overview</h1>
            <p className="text-gray-600">Internal view of all organization subscriptions.</p>

            <div className="bg-white rounded-lg shadow overflow-hidden border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organization</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Customer ID</TableHead>
                            <TableHead>Renews/Cancels</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptions.map(sub => (
                            <TableRow key={sub.id}>
                                <TableCell className="font-medium">
                                    {sub.organization.name}
                                    <div className="text-xs text-gray-500">/{sub.organization.slug}</div>
                                </TableCell>
                                <TableCell><Badge variant="outline">{sub.plan}</Badge></TableCell>
                                <TableCell>
                                    <Badge variant={sub.status === "ACTIVE" ? "default" : "destructive"}>{sub.status}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-gray-500">{sub.stripeCustomerId || "N/A"}</TableCell>
                                <TableCell className="text-sm text-gray-600">
                                    {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "-"}
                                    {sub.cancelAtPeriodEnd && <span className="ml-2 text-red-500">(Canceling)</span>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
