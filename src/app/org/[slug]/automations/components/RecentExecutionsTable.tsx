import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Prisma } from '@prisma/client';

type ExecutionWithDetails = Prisma.AutomationExecutionGetPayload<{
  include: {
    automation: true;
    lead: { include: { contact: true } };
  };
}>;

interface RecentExecutionsTableProps {
  recentExecutions: ExecutionWithDetails[];
}

export function RecentExecutionsTable({ recentExecutions }: RecentExecutionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
        <CardDescription>
          The last 50 automation jobs processed by the background engine.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Execution ID</TableHead>
              <TableHead>Automation</TableHead>
              <TableHead>Target Lead</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentExecutions.map((exec) => (
              <TableRow key={exec.id}>
                <TableCell className="font-mono text-xs text-gray-500">
                  {exec.id.split('-')[0]}...
                </TableCell>
                <TableCell className="font-medium">{exec.automation.name}</TableCell>
                <TableCell>
                  {exec.lead.contact?.firstName} {exec.lead.contact?.lastName}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      exec.status === 'COMPLETED'
                        ? 'default'
                        : exec.status === 'FAILED'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {exec.status}
                  </Badge>
                  {exec.error && (
                    <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={exec.error}>
                      {exec.error}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {format(new Date(exec.createdAt), 'MMM d, h:mm a')}
                </TableCell>
              </TableRow>
            ))}
            {recentExecutions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-8 text-gray-500">
                  No execution history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
