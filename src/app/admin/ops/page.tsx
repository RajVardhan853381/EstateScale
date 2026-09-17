"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Stats = {
    organizations: { total: number };
    users: { total: number };
    ai: { totalExecutions: number };
    infrastructure: { outboxPending: number };
};

export default function OpsDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/ops/stats")
            .then(res => {
                if (!res.ok) throw new Error("Forbidden or Network Error");
                return res.json();
            })
            .then(setStats)
            .catch(e => setError(e.message));
    }, []);

    if (error) {
        return <div className="p-8 text-red-500 font-bold text-xl">Platform Access Denied: {error}</div>;
    }

    if (!stats) return <div className="p-8">Loading Operations Center...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Platform Operations Center</h1>
                <Link href="/admin/ops/orgs">
                   <Button>Manage Organizations</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader><CardTitle>Organizations</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{stats.organizations.total}</p>
                        <p className="text-sm text-slate-500">Active tenants</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Global Users</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{stats.users.total}</p>
                        <p className="text-sm text-slate-500">Across all orgs</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>AI Executions</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{stats.ai.totalExecutions}</p>
                        <p className="text-sm text-slate-500">Total Provider calls</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Outbox Backlog</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{stats.infrastructure.outboxPending}</p>
                        <p className="text-sm text-slate-500">Pending events</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
