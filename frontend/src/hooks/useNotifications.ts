import { useCallback, useEffect, useState } from "react";
import {
  getNotifications,
  markAsRead as markAsReadRequest,
  markAllAsRead as markAllAsReadRequest,
  NOTIFICATIONS_REFRESH_EVENT,
  type AppNotification,
} from "../services/notificationService";

const POLL_INTERVAL_MS = 15000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    getNotifications()
      .then((result) => {
        setNotifications(result.notifications);
        setUnreadCount(result.unread_count);
      })
      .catch(() => {
        // Échec silencieux : le prochain poll réessaiera.
      });
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, load);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, load);
    };
  }, [load]);

  const markAsRead = useCallback(async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markAsReadRequest(id);
    } catch {
      load();
    }
  }, [load]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await markAllAsReadRequest();
    } catch {
      load();
    }
  }, [load]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
