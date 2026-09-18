'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

type HealthStatus = {
  status: string;
  db: string;
  redis: string;
};

export default function SystemHealthPage() {
  const [status, setStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    fetch('/api/ready')
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus({ status: 'DOWN', db: 'DOWN', redis: 'DOWN' }));
  }, []);

  if (!status) return <div className="p-8">Pinging core dependencies...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">System Health Matrix</h1>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
          <span className="font-semibold text-lg">Overall Platform</span>
          <Badge variant={status.status === 'UP' ? 'default' : 'destructive'}>
            {status.status}
          </Badge>
        </div>

        <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
          <div>
            <span className="font-semibold">PostgreSQL</span>
            <p className="text-sm text-slate-500">Prisma Database Connectivity</p>
          </div>
          <Badge variant={status.db === 'UP' ? 'default' : 'destructive'}>{status.db}</Badge>
        </div>

        <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
          <div>
            <span className="font-semibold">Redis / Upstash</span>
            <p className="text-sm text-slate-500">BullMQ & Rate Limiting cache</p>
          </div>
          <Badge variant={status.redis === 'UP' ? 'default' : 'destructive'}>{status.redis}</Badge>
        </div>
      </div>
    </div>
  );
}
