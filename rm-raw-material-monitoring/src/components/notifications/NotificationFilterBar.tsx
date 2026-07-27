import React from 'react';
import {
  Search,
  CheckCheck,
  Trash2,
  BellRing,
  AlertTriangle,
  RefreshCw,
  Layers,
  Mail,
  ShieldAlert
} from 'lucide-react';
import type { NotificationCategory } from '../../utils/notificationCenterUtils';
import { requestBrowserPushPermission } from '../../utils/notificationCenterUtils';

export interface NotificationFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: NotificationCategory | 'all';
  onCategoryChange: (cat: NotificationCategory | 'all') => void;
  unreadOnly: boolean;
  onToggleUnreadOnly: () => void;
  onMarkAllAsRead: () => void;
  onClearRead: () => void;
  categoryCounts: Record<NotificationCategory | 'all', number>;
  pushPermissionState: NotificationPermission | 'unsupported';
  onRequestPushPermission: () => void;
}

export const NotificationFilterBar: React.FC<NotificationFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  unreadOnly,
  onToggleUnreadOnly,
  onMarkAllAsRead,
  onClearRead,
  categoryCounts,
  pushPermissionState,
  onRequestPushPermission
}) => {
  const tabs: { id: NotificationCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Items', icon: Layers },
    { id: 'low_stock', label: 'Low Stock Alerts', icon: AlertTriangle },
    { id: 'inventory_update', label: 'Inventory Updates', icon: RefreshCw },
    { id: 'rack_change', label: 'Rack Changes', icon: Layers },
    { id: 'system', label: 'System Logs', icon: ShieldAlert },
    { id: 'email_history', label: 'Email History', icon: Mail }
  ];

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all shadow-xl space-y-4">
      {/* Search Input & Action Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notification messages, barcodes, racks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Push Notification Toggle Button */}
          {pushPermissionState !== 'granted' && pushPermissionState !== 'unsupported' && (
            <button
              onClick={onRequestPushPermission}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer"
            >
              <BellRing className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              Enable Push Notifications
            </button>
          )}

          {/* Mark All Read */}
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
            Mark All Read
          </button>

          {/* Clear Read */}
          <button
            onClick={onClearRead}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Read
          </button>
        </div>
      </div>

      {/* Category Pills & Unread Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedCategory === tab.id;
            const count = categoryCounts[tab.id] || 0;

            return (
              <button
                key={tab.id}
                onClick={() => onCategoryChange(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className="rounded-full bg-slate-800/80 px-2 py-0.2 text-[10px] font-mono text-slate-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Unread Only Switch */}
        <button
          onClick={onToggleUnreadOnly}
          className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer ${
            unreadOnly
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${unreadOnly ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
          Unread Only
        </button>
      </div>
    </div>
  );
};
