import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldAlert,
  Mail,
  Check,
  Trash2,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import type {
  NotificationItem,
  NotificationCategory,
  DateGroupedNotifications
} from '../../utils/notificationCenterUtils';

export interface NotificationGroupSectionProps {
  groups: DateGroupedNotifications[];
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const categoryIcons: Record<NotificationCategory, any> = {
  low_stock: AlertTriangle,
  inventory_update: RefreshCw,
  rack_change: Layers,
  system: ShieldAlert,
  email_history: Mail
};

const categoryBadges: Record<NotificationCategory, { label: string; style: string }> = {
  low_stock: { label: 'Low Stock', style: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  inventory_update: { label: 'Inventory', style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  rack_change: { label: 'Rack Change', style: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  system: { label: 'System', style: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  email_history: { label: 'Email Sent', style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
};

export const NotificationGroupSection: React.FC<NotificationGroupSectionProps> = ({
  groups,
  onToggleRead,
  onDelete
}) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-12 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-slate-500 mb-3" />
        <h3 className="text-base font-bold text-slate-200">No Notifications</h3>
        <p className="text-xs text-slate-400 mt-1">
          No notifications match your current filter or search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.groupLabel} className="space-y-3">
          {/* Date Group Header */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {group.groupLabel}
            </h3>
            <span className="rounded-full bg-slate-800 px-2 py-0.2 text-[10px] font-mono text-slate-400">
              {group.items.length}
            </span>
          </div>

          {/* Group Items List */}
          <div className="space-y-3">
            {group.items.map((item) => {
              const Icon = categoryIcons[item.category] || ShieldAlert;
              const badge = categoryBadges[item.category] || { label: item.category, style: '' };
              const timeStr = new Date(item.date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-2xl border p-4 transition-all duration-200 ${
                    item.isRead
                      ? 'border-slate-800/60 bg-slate-900/40 opacity-75 hover:opacity-100'
                      : 'border-cyan-500/30 bg-slate-900/90 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon & Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          item.category === 'low_stock'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : item.category === 'email_history'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Unread Blue Dot */}
                          {!item.isRead && (
                            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                          )}

                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badge.style}`}>
                            {badge.label}
                          </span>

                          {item.recipient && (
                            <span className="rounded-full bg-slate-800 px-2 py-0.2 text-[10px] font-mono text-slate-300">
                              Recipient: {item.recipient}
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 ml-auto shrink-0">
                            <Clock size={10} /> {timeStr}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {item.title}
                        </h4>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onToggleRead(item.id)}
                        title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                        className={`rounded-lg p-2 transition-all cursor-pointer ${
                          item.isRead
                            ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                            : 'text-cyan-400 hover:bg-cyan-500/20'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onDelete(item.id)}
                        title="Delete notification"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
