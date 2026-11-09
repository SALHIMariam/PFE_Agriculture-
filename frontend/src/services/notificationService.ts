import api from "../api/client";

/**
 * Fired on `window` when something should make the notification bell reload
 * immediately (e.g. the farmer toggled a notification preference).
 */
export const NOTIFICATIONS_REFRESH_EVENT = "notifications:refresh";

export type NotificationType =
  | "new_message"
  | "expert_reply"
  | "new_analysis"
  | "analysis_validated"
  | "analysis_rejected"
  | "risk_alert"
  | "calendar_note";

export type AppNotification = {
  id: number;
  type: NotificationType | string;
  title: string;
  body: string;
  data: {
    analysis_id?: number;
    message_id?: number;
    disease?: string;
    crop?: string;
    governorate?: string;
    risk_score?: number;
    level?: "informative" | "urgent";
    note_id?: number;
    date?: string;
    author_id?: number;
    author_name?: string;
  } | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string | null;
};

export type NotificationsResponse = {
  notifications: AppNotification[];
  unread_count: number;
};

export async function getNotifications(): Promise<NotificationsResponse> {
  const response = await api.get("/api/notifications");
  return response.data as NotificationsResponse;
}

export async function markAsRead(id: number): Promise<AppNotification> {
  const response = await api.patch(`/api/notifications/${id}/read`);
  return response.data.notification as AppNotification;
}

export async function markAllAsRead(): Promise<void> {
  await api.patch("/api/notifications/read-all");
}

export async function deleteNotification(id: number): Promise<void> {
  await api.delete(`/api/notifications/${id}`);
}

export type NotificationCategory = "all" | "alerts" | "analyses" | "messages" | "calendar";

export type NotificationsPageResponse = NotificationsResponse & {
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

/** Liste paginée et filtrée pour la page « Toutes les notifications ». */
export async function getNotificationsPage(params: {
  page: number;
  perPage?: number;
  status?: "all" | "unread";
  category?: NotificationCategory;
}): Promise<NotificationsPageResponse> {
  const response = await api.get("/api/notifications", {
    params: {
      page: params.page,
      per_page: params.perPage ?? 20,
      status: params.status ?? "all",
      category: params.category ?? "all",
    },
  });
  return response.data as NotificationsPageResponse;
}

/** Demande à la cloche du header de se recharger immédiatement. */
export function refreshNotificationBell(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
}
