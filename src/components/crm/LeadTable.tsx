"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeadStatus, Prisma } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

export type LeadForTable = Prisma.LeadGetPayload<{
  include: {
    contact: true;
    assignedUser: { include: { user: true } };
    pipelineStage: true;
  }
}>;

export function LeadTable({ leads, organizationSlug }: { leads: LeadForTable[], organizationSlug: string }) {
  if (!leads.length) {
    return <div className="text-center p-8 text-gray-500">No leads found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Contact</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Assigned Agent</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>
              <div className="font-medium">
                {lead.contact?.firstName} {lead.contact?.lastName}
              </div>
              <div className="text-xs text-gray-500">{lead.contact?.email}</div>
            </TableCell>
            <TableCell>
              <Badge variant={lead.status === LeadStatus.CLOSED_WON ? "default" : "secondary"}>
                {lead.status}
              </Badge>
            </TableCell>
            <TableCell>{lead.pipelineStage?.name || "None"}</TableCell>
            <TableCell>{lead.assignedUser?.user?.name || "Unassigned"}</TableCell>
            <TableCell>{format(new Date(lead.createdAt), 'MMM d, yyyy')}</TableCell>
            <TableCell>
               <Link href={`/org/${organizationSlug}/leads/${lead.id}`} className="text-blue-600 hover:underline">
                 View
               </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
