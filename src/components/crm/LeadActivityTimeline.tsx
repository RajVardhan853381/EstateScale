"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Prisma } from "@prisma/client";

export type ActivityWithUser = Prisma.LeadActivityGetPayload<{
  include: {
    user: { include: { user: true } }
  }
}>;

export function LeadActivityTimeline({ activities }: { activities: ActivityWithUser[] }) {
  if (!activities || activities.length === 0) {
    return <div className="text-gray-500 text-sm">No activity recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-4 p-3 border rounded-lg bg-white shadow-sm">
          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">
                    {activity.user?.user?.name || "System"}
                </span>
                <span className="text-xs text-gray-500">
                    {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
            </div>
            <p className="text-sm text-gray-700">{activity.description}</p>
            <div className="mt-2">
                <Badge variant="outline" className="text-xs">{activity.type}</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
