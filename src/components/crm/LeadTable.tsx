import React from 'react';
import { Lead, Contact, OrganizationMembership, User, PipelineStage } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type LeadWithRelations = Lead & {
  contact: Contact | null;
  assignedUser: (OrganizationMembership & { user: User }) | null;
  pipelineStage: PipelineStage | null;
};

interface LeadTableProps {
  leads: LeadWithRelations[];
  organizationSlug: string;
}

export function LeadTable({ leads, organizationSlug }: LeadTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Contact</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Assigned</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center h-24">
              No leads found.
            </TableCell>
          </TableRow>
        ) : (
          leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <Link
                  href={`/org/${organizationSlug}/leads/${lead.id}`}
                  className="font-medium hover:underline text-blue-600"
                >
                  {lead.contact?.firstName} {lead.contact?.lastName}
                </Link>
                <div className="text-xs text-gray-500">{lead.contact?.email}</div>
              </TableCell>
              <TableCell>
                <Badge variant={lead.status === 'NEW' ? 'default' : 'secondary'}>
                  {lead.status}
                </Badge>
              </TableCell>
              <TableCell>{lead.pipelineStage?.name || '-'}</TableCell>
              <TableCell>{lead.assignedUser?.user.name || 'Unassigned'}</TableCell>
              <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
