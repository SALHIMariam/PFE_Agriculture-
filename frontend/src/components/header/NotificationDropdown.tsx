import { useState } from "react";
import { useNavigate } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useNotifications } from "../../hooks/useNotifications";
import { useRiskAlerts } from "../../hooks/useRiskAlerts";
import type { AppNotification } from "../../services/notificationService";
import { TYPE_ICON, notificationTarget, relativeTime } from "../notifications/notificationUtils";

const ALERT_SEVERITY_STYLE: Record<string, string> = {
  moderate: "border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
  high: "border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10",
  critical: "border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10",
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const riskAlerts = useRiskAlerts();

  function toggleDropdown() {
    setIsOpen((v) => !v);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleItemClick(notification: AppNotification) {
    if (!notification.is_read) markAsRead(notification.id);
    closeDropdown();
    const target = notificationTarget(notification);
    if (target) navigate(target);
  }

  function handleAlertClick() {
    closeDropdown();
    navigate("/dashboard/heatmap");
  }

  const visible = notifications.slice(0, 10);

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex max-h-[min(640px,calc(100vh-110px))] w-[380px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:right-0 max-sm:fixed max-sm:inset-x-0 max-sm:top-full max-sm:mt-0 max-sm:w-auto max-sm:max-h-[calc(100vh-140px)] max-sm:rounded-none max-sm:border-x-0"
      >
        <div className="flex shrink-0 items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-brand-500 hover:text-brand-600"
              >
                Tout marquer comme lu
              </button>
            )}
            <button
              onClick={toggleDropdown}
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
        {/* Seule cette zone défile : les alertes régionales en font partie,
            sinon elles mangent la hauteur et la liste n'a plus de place. */}
        <div className="notif-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {riskAlerts.length > 0 && (
          <div className="mb-2 border-b border-gray-100 pb-2 dark:border-gray-800">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Alertes régionales
            </p>
            <ul className="flex flex-col gap-1">
              {riskAlerts.slice(0, 5).map((alert) => (
                <li key={`${alert.governorate}-${alert.disease_key}`}>
                  <button
                    type="button"
                    onClick={handleAlertClick}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition hover:brightness-95 ${
                      ALERT_SEVERITY_STYLE[alert.severity] ?? ALERT_SEVERITY_STYLE.moderate
                    }`}
                  >
                    <span className="text-amber-500">⚠</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-700 dark:text-gray-200">
                        {alert.governorate} — {alert.disease}
                      </span>
                      <span className="block truncate text-gray-500 dark:text-gray-400">{alert.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className="flex flex-col">
          {visible.length === 0 && riskAlerts.length === 0 && (
            <li className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              Aucune notification
            </li>
          )}
          {visible.map((notification) => (
            <li key={notification.id}>
              <DropdownItem
                onItemClick={() => handleItemClick(notification)}
                className={`flex gap-3 rounded-lg border-b p-3 px-4.5 py-3 hover:bg-gray-100 dark:hover:bg-white/5 ${
                  notification.type === "risk_alert"
                    ? notification.data?.level === "urgent"
                      ? "border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
                      : "border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
                    : !notification.is_read
                    ? "border-gray-100 bg-emerald-50 dark:border-gray-800 dark:bg-emerald-500/10"
                    : "border-gray-100 bg-white dark:border-gray-800 dark:bg-transparent"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                    notification.type === "risk_alert"
                      ? notification.data?.level === "urgent"
                        ? "bg-red-100 dark:bg-red-500/15"
                        : "bg-amber-100 dark:bg-amber-500/15"
                      : "bg-gray-100 dark:bg-white/5"
                  }`}
                >
                  {TYPE_ICON[notification.type] ?? "🔔"}
                </span>

                <span className="block flex-1 text-left">
                  <span className="mb-1 block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    {notification.title}
                  </span>
                  <span className="mb-1 block text-theme-xs text-gray-500 dark:text-gray-400">
                    {notification.body}
                  </span>
                  <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                    {relativeTime(notification.created_at)}
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>
        </div>
        <button
          type="button"
          onClick={() => {
            closeDropdown();
            navigate("/dashboard/notifications");
          }}
          className="block shrink-0 px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          Voir tout
        </button>
      </Dropdown>
    </div>
  );
}
