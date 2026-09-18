'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type Org = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  _count: { memberships: number; leads: number };
};

export default function ManageOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/admin/ops/orgs?q=${encodeURIComponent(search)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setOrgs(data);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Tenant Organizations</h1>

      <div className="mb-6">
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="bg-white border rounded-lg shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell className="text-slate-500">{org.slug}</TableCell>
                <TableCell>
                  <Badge variant={org.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {org.status}
                  </Badge>
                </TableCell>
                <TableCell>{org._count.memberships}</TableCell>
                <TableCell>{org._count.leads}</TableCell>
                <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {orgs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  No organizations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
