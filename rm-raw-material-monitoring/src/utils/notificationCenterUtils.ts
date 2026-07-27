export type NotificationCategory =
  | 'low_stock'
  | 'inventory_update'
  | 'rack_change'
  | 'system'
  | 'email_history';

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'info';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  date: string; // ISO string or timestamp
  severity: NotificationSeverity;
  isRead: boolean;
  recipient?: string;
  entityCode?: string;
}

export interface DateGroupedNotifications {
  groupLabel: string;
  items: NotificationItem[];
}

const READ_NOTIFS_KEY = 'rm_read_notification_ids';
const DELETED_NOTIFS_KEY = 'rm_deleted_notification_ids';

/**
 * Gets set of read notification IDs from LocalStorage
 */
export const getReadNotificationIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

/**
 * Gets set of deleted notification IDs from LocalStorage
 */
export const getDeletedNotificationIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_NOTIFS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

/**
 * Marks notification as read in LocalStorage
 */
export const markNotificationAsReadInStorage = (id: string) => {
  try {
    const readSet = getReadNotificationIds();
    readSet.add(id);
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(readSet)));
  } catch (e) {
    console.error('Failed to save read notification:', e);
  }
};

/**
 * Marks all notifications as read in LocalStorage
 */
export const markAllNotificationsAsReadInStorage = (ids: string[]) => {
  try {
    const readSet = getReadNotificationIds();
    ids.forEach((id) => readSet.add(id));
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(readSet)));
  } catch (e) {
    console.error('Failed to save all read notifications:', e);
  }
};

/**
 * Deletes notification in LocalStorage
 */
export const deleteNotificationInStorage = (id: string) => {
  try {
    const deletedSet = getDeletedNotificationIds();
    deletedSet.add(id);
    localStorage.setItem(DELETED_NOTIFS_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (e) {
    console.error('Failed to delete notification:', e);
  }
};

/**
 * Groups notifications chronologically by date
 */
export const groupNotificationsByDate = (items: NotificationItem[]): DateGroupedNotifications[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: Record<string, NotificationItem[]> = {
    Today: [],
    Yesterday: [],
    'Earlier This Week': [],
    Older: []
  };

  items.forEach((item) => {
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate.getTime() === today.getTime()) {
      groups.Today.push(item);
    } else if (itemDate.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(item);
    } else if (itemDate >= sevenDaysAgo) {
      groups['Earlier This Week'].push(item);
    } else {
      groups.Older.push(item);
    }
  });

  return Object.entries(groups)
    .filter(([_, list]) => list.length > 0)
    .map(([groupLabel, list]) => ({
      groupLabel,
      items: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }));
};

/**
 * Web Push Notification API Helper (Future integration)
 */
export const requestBrowserPushPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    alert('This browser does not support native desktop push notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Send native browser push notification
 */
export const sendBrowserPushNotification = (title: string, body: string, icon?: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico'
      });
    } catch (e) {
      console.error('Failed to trigger push notification:', e);
    }
  }
};
