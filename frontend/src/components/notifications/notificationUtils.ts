import type { AppNotification } from "../../services/notificationService";

/** Icônes par type, partagées par la cloche du header et la page /dashboard/notifications. */
export const TYPE_ICON: Record<string, string> = {
  new_message: "💬",
  expert_reply: "💬",
  new_analysis: "🔬",
  analysis_validated: "✓",
  analysis_rejected: "✗",
  risk_alert: "🚨",
  calendar_note: "📅",
};

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `il y a ${diffDays} j`;
}

/** Page vers laquelle mène une notification, ou null si elle n'a pas de cible. */
export function notificationTarget(notification: AppNotification): string | null {
  if (notification.data?.note_id && !notification.data?.analysis_id) {
    return "/dashboard/calendar";
  }
  if (notification.data?.analysis_id) {
    return `/dashboard/analyses/${notification.data.analysis_id}`;
  }
  if (notification.type === "risk_alert") {
    return "/dashboard/heatmap";
  }
  return null;
}
