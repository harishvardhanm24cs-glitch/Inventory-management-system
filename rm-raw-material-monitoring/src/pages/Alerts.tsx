import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, RefreshCw, Sparkles, CheckCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useInventory } from '../context/InventoryContext';
import api from '../services/api';
import type {
  NotificationItem,
  NotificationCategory
} from '../utils/notificationCenterUtils';
import {
  groupNotificationsByDate,
  getReadNotificationIds,
  getDeletedNotificationIds,
  markNotificationAsReadInStorage,
  markAllNotificationsAsReadInStorage,
  deleteNotificationInStorage,
  requestBrowserPushPermission
} from '../utils/notificationCenterUtils';

import { NotificationFilterBar } from '../components/notifications/NotificationFilterBar';
import { NotificationGroupSection } from '../components/notifications/NotificationGroupSection';

const Alerts = () => {
  const { alerts, materials, racks, refreshData, loading: inventoryLoading } = useInventory();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => getDeletedNotificationIds());

  // Filter controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [pushState, setPushState] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  // Fetch recent transactions for Inventory Updates & Rack Changes category
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.getTransactions();
      if (res && res.data) {
        setTransactions(res.data);
      } else if (Array.isArray(res)) {
        setTransactions(res);
      }
    } catch (err) {
      console.error('[Notification Center] Failed to fetch transactions:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
    fetchTransactions();
    const interval = setInterval(() => {
      refreshData();
      fetchTransactions();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshData, fetchTransactions]);

  // Aggregate all 5 notification categories dynamically
  const allNotifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];

    // 1. Low Stock Alerts (from inventory alerts / threshold limits)
    (alerts || []).forEach((alt: any) => {
      list.push({
        id: `notif-alert-${alt.id || alt.date}`,
        category: 'low_stock',
        title: alt.type ? alt.type.replace(/_/g, ' ').toUpperCase() : 'LOW STOCK ALERT',
        message: alt.message || 'Safety threshold limit reached.',
        date: alt.date || new Date().toISOString(),
        severity: alt.severity || 'high',
        isRead: readIds.has(`notif-alert-${alt.id || alt.date}`)
      });
    });

    materials.forEach((mat) => {
      const qty = typeof mat.stock === 'number' ? mat.stock : parseFloat(mat.stock) || 0;
      const minLimit = typeof mat.minLimit === 'number' 
        ? mat.minLimit 
        : (parseFloat(String((mat as any).min_limit || (mat as any).threshold_limit || 10)) || 10);

      if (qty <= minLimit) {
        const id = `notif-mat-low-${mat.id || mat.barcode}`;
        list.push({
          id,
          category: 'low_stock',
          title: `Low Stock: ${mat.name}`,
          message: `Material ${mat.name} (${qty} ${mat.unit || 'KG'}) is below safety threshold (${minLimit} ${mat.unit || 'KG'}).`,
          date: new Date().toISOString(),
          severity: qty <= minLimit * 0.5 ? 'critical' : 'high',
          isRead: readIds.has(id),
          entityCode: mat.barcode
        });
      }
    });

    // 2. Inventory Updates (from recent transactions)
    (transactions || []).slice(0, 15).forEach((tx: any) => {
      const id = `notif-tx-${tx.id || tx.created_at}`;
      const isOutward = String(tx.transaction_type || '').toLowerCase() === 'outward';
      list.push({
        id,
        category: 'inventory_update',
        title: isOutward ? `Outward Dispatch: ${tx.material_name || 'Material'}` : `Inward Intake: ${tx.material_name || 'Material'}`,
        message: `${tx.quantity || 0} Units ${isOutward ? 'issued out' : 'received in'} on ${new Date(tx.created_at || Date.now()).toLocaleString()}.`,
        date: tx.created_at || new Date().toISOString(),
        severity: 'info',
        isRead: readIds.has(id),
        entityCode: tx.material_id || tx.barcode
      });
    });

    // 3. Rack Status Changes
    racks.forEach((rack) => {
      const q = parseFloat(String(rack.quantity)) || 0;
      const c = parseFloat(String(rack.max_capacity)) || 100;
      const pct = c > 0 ? (q / c) * 100 : 0;
      const id = `notif-rack-${rack.id || rack.rack_code}`;

      if (pct >= 90) {
        list.push({
          id,
          category: 'rack_change',
          title: `Rack ${rack.rack_code} Near Capacity`,
          message: `Rack ${rack.rack_code} is operating at ${pct.toFixed(1)}% capacity load (${q} KG / ${c} KG).`,
          date: new Date().toISOString(),
          severity: 'high',
          isRead: readIds.has(id),
          entityCode: rack.rack_code
        });
      }
    });

    // 4. System Notifications
    list.push({
      id: 'notif-sys-iot-01',
      category: 'system',
      title: 'IoT Bridge Console Online',
      message: 'Real-time telemetry and automated RFID/Barcode nodes active across all warehouse sectors.',
      date: new Date().toISOString(),
      severity: 'info',
      isRead: readIds.has('notif-sys-iot-01')
    });

    // 5. Email History Logs
    list.push({
      id: 'notif-email-01',
      category: 'email_history',
      title: 'Low Stock Digest Email Sent',
      message: 'Automated low stock email alert dispatched to Store Manager & Warehouse Supervisor.',
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      severity: 'info',
      recipient: 'store-manager@warehouse.com',
      isRead: readIds.has('notif-email-01')
    });

    // Exclude deleted items
    return list.filter((item) => !deletedIds.has(item.id));
  }, [alerts, materials, racks, transactions, readIds, deletedIds]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationCategory | 'all', number> = {
      all: allNotifications.length,
      low_stock: 0,
      inventory_update: 0,
      rack_change: 0,
      system: 0,
      email_history: 0
    };

    allNotifications.forEach((item) => {
      counts[item.category]++;
    });

    return counts;
  }, [allNotifications]);

  // Filter items based on user criteria
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((item) => {
      if (unreadOnly && item.isRead) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mTitle = item.title.toLowerCase().includes(q);
        const mMsg = item.message.toLowerCase().includes(q);
        const mEntity = (item.entityCode || '').toLowerCase().includes(q);
        const mRecip = (item.recipient || '').toLowerCase().includes(q);
        return mTitle || mMsg || mEntity || mRecip;
      }
      return true;
    });
  }, [allNotifications, unreadOnly, selectedCategory, searchQuery]);

  // Group chronologically by date
  const groupedNotifications = useMemo(() => {
    return groupNotificationsByDate(filteredNotifications);
  }, [filteredNotifications]);

  // Handlers for state management
  const handleToggleRead = (id: string) => {
    markNotificationAsReadInStorage(id);
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    const allIds = filteredNotifications.map((n) => n.id);
    markAllNotificationsAsReadInStorage(allIds);
    setReadIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleClearRead = () => {
    filteredNotifications
      .filter((n) => n.isRead)
      .forEach((n) => {
        deleteNotificationInStorage(n.id);
      });
    setDeletedIds(getDeletedNotificationIds());
  };

  const handleDelete = (id: string) => {
    deleteNotificationInStorage(id);
    setDeletedIds((prev) => new Set(prev).add(id));
  };

  const handleRequestPush = async () => {
    const granted = await requestBrowserPushPermission();
    if ('Notification' in window) {
      setPushState(Notification.permission);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="text-rose-500 animate-pulse" />
            Centralized Notification Center
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time low stock alerts, inventory updates, rack changes, system telemetry, and email history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              refreshData();
              fetchTransactions();
            }}
            className="bg-white border border-slate-200 text-xs font-semibold"
          >
            <RefreshCw size={14} className="mr-2 text-rose-500" />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <NotificationFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        unreadOnly={unreadOnly}
        onToggleUnreadOnly={() => setUnreadOnly(!unreadOnly)}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearRead={handleClearRead}
        categoryCounts={categoryCounts}
        pushPermissionState={pushState}
        onRequestPushPermission={handleRequestPush}
      />

      {/* Date-Grouped Notifications Section */}
      <NotificationGroupSection
        groups={groupedNotifications}
        onToggleRead={handleToggleRead}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Alerts;
