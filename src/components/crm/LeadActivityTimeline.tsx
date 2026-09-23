'use client';

import { format } from 'date-fns';
import { Prisma } from '@prisma/client';
import {
  UserCheck,
  FileText,
  Tag,
  PhoneCall,
  Calendar,
  ArrowRightCircle,
  Activity,
} from 'lucide-react';

export type ActivityWithUser = Prisma.LeadActivityGetPayload<{
  include: {
    user: { include: { user: true } };
  };
}>;

export function LeadActivityTimeline({ activities }: { activities: ActivityWithUser[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No activity logged yet.
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'NOTE_ADDED':
        return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
      case 'STATUS_CHANGED':
        return <ArrowRightCircle className="w-3.5 h-3.5 text-cyan-600" />;
      case 'ASSIGNED':
        return <UserCheck className="w-3.5 h-3.5 text-purple-600" />;
      case 'CONTACTED':
        return <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />;
      case 'APPOINTMENT':
        return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
      case 'TAG_ADDED':
      case 'TAG_REMOVED':
        return <Tag className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {activities.map((activity) => {
        const actorName = activity.user?.user?.name || 'System Engine';

        return (
          <div key={activity.id} className="relative group">
            {/* Timeline Node Icon */}
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center group-hover:border-indigo-500 transition-colors shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-indigo-600 transition-colors" />
            </div>

            <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 hover:bg-white hover:shadow-2xs transition-all">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  {getActivityIcon(activity.type)}
                  <span>{actorName}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                  {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activity.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
