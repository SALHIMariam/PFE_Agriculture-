import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import styles from "../FarmerDashboard.module.css";
import { useNotifications } from "../../../hooks/useNotifications";
import type { AppNotification } from "../../../services/notificationService";

const TYPE_ICON: Record<string, string> = {
  new_message: "💬",
  expert_reply: "💬",
  new_analysis: "🔬",
  analysis_validated: "✓",
  analysis_rejected: "✗",
  risk_alert: "⚠️",
};

const DROPDOWN_WIDTH = 340;

function relativeTime(iso: string | null): string {
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

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const reposition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 12,
      left: Math.max(8, rect.right - DROPDOWN_WIDTH),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleItemClick(notification: AppNotification) {
    if (!notification.is_read) markAsRead(notification.id);
    setOpen(false);
    if (notification.data?.analysis_id) {
      navigate(`/farmer/analyses/${notification.data.analysis_id}`);
    }
  }

  const visible = notifications.slice(0, 10);

  return (
    <div className={styles["notif-bell-wrap"]}>
      <button
        ref={buttonRef}
        type="button"
        className={styles["notif-bell-btn"]}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles["notif-badge"]}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open &&
        coords &&
        createPortal(
          <>
            <div
              className={styles["notif-backdrop"]}
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
              onClick={() => setOpen(false)}
            />
            <div
              className={styles["notif-dropdown"]}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                right: "auto",
                width: DROPDOWN_WIDTH,
                maxWidth: "90vw",
                zIndex: 9999,
              }}
            >
              <div className={styles["notif-dropdown-head"]}>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button type="button" className={styles["notif-mark-all"]} onClick={markAllAsRead}>
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              {visible.length === 0 ? (
                <div className={styles["notif-empty"]}>Aucune notification</div>
              ) : (
                <div className={styles["notif-list"]}>
                  {visible.map((notification) => (
                    <div
                      key={notification.id}
                      className={`${styles["notif-row"]} ${!notification.is_read ? styles.unread : ""}`}
                      onClick={() => handleItemClick(notification)}
                    >
                      <span className={styles["notif-row-icon"]}>
                        {TYPE_ICON[notification.type] ?? "🔔"}
                      </span>
                      <div className={styles["notif-row-body"]}>
                        <div className={styles["notif-row-title"]}>{notification.title}</div>
                        <div className={styles["notif-row-text"]}>{notification.body}</div>
                        <div className={styles["notif-row-time"]}>
                          {relativeTime(notification.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className={styles["notif-view-all"]}
                onClick={() => setOpen(false)}
              >
                Voir tout
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
