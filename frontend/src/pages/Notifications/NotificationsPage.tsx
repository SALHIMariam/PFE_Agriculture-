import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  TYPE_ICON,
  notificationTarget,
  relativeTime,
} from "../../components/notifications/notificationUtils";
import {
  deleteNotification,
  getNotificationsPage,
  markAllAsRead,
  markAsRead,
  refreshNotificationBell,
  type AppNotification,
  type NotificationCategory,
} from "../../services/notificationService";

const CATEGORIES: { key: NotificationCategory; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "alerts", label: "🚨 Alertes" },
  { key: "analyses", label: "🔬 Analyses" },
  { key: "messages", label: "💬 Messages" },
  { key: "calendar", label: "📅 Calendrier" },
];

function dayLabel(iso: string | null): string {
  if (!iso) return "Date inconnue";
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function rowTone(n: AppNotification): string {
  if (n.type === "risk_alert") {
    return n.data?.level === "urgent"
      ? "border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
      : "border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10";
  }
  return !n.is_read
    ? "border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
    : "border-gray-100 bg-white dark:border-gray-800 dark:bg-transparent";
}

function iconTone(n: AppNotification): string {
  if (n.type === "risk_alert") {
    return n.data?.level === "urgent" ? "bg-red-100 dark:bg-red-500/15" : "bg-amber-100 dark:bg-amber-500/15";
  }
  return "bg-gray-100 dark:bg-white/5";
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<"all" | "unread">("all");
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (nextPage: number) => {
      const append = nextPage > 1;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      getNotificationsPage({ page: nextPage, status, category })
        .then((res) => {
          setItems((prev) => (append ? [...prev, ...res.notifications] : res.notifications));
          setPage(res.meta.current_page);
          setLastPage(res.meta.last_page);
          setTotal(res.meta.total);
          setUnreadCount(res.unread_count);
        })
        .catch(() => setError("Impossible de charger les notifications."))
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [status, category],
  );

  // Recharge depuis la page 1 à chaque changement de filtre.
  useEffect(() => {
    load(1);
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const n of items) {
      const label = dayLabel(n.created_at);
      map.set(label, [...(map.get(label) ?? []), n]);
    }
    return [...map.entries()];
  }, [items]);

  async function handleMarkRead(n: AppNotification) {
    if (n.is_read) return;
    setItems((prev) =>
      status === "unread" ? prev.filter((x) => x.id !== n.id) : prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    if (status === "unread") setTotal((t) => Math.max(0, t - 1));
    try {
      await markAsRead(n.id);
    } catch {
      load(1);
    } finally {
      refreshNotificationBell();
    }
  }

  async function handleMarkAll() {
    setItems((prev) => (status === "unread" ? [] : prev.map((x) => ({ ...x, is_read: true }))));
    setUnreadCount(0);
    if (status === "unread") setTotal(0);
    try {
      await markAllAsRead();
    } catch {
      load(1);
    } finally {
      refreshNotificationBell();
    }
  }

  async function handleDelete(n: AppNotification) {
    const previous = items;
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    setTotal((t) => Math.max(0, t - 1));
    if (!n.is_read) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await deleteNotification(n.id);
      refreshNotificationBell();
    } catch {
      setItems(previous);
      setError("La suppression a échoué.");
    }
  }

  function handleOpen(n: AppNotification) {
    handleMarkRead(n);
    const target = notificationTarget(n);
    if (target) navigate(target);
  }

  return (
    <>
      <PageMeta title="Notifications | AgriNova" description="Toutes vos notifications" />
      <PageBreadcrumb pageTitle="Notifications" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Toutes les notifications</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total} notification{total > 1 ? "s" : ""}
              {unreadCount > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-brand-500">
                    {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="mr-2 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            {(["all", "unread"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  status === s
                    ? "bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                {s === "all" ? "Toutes" : "Non lues"}
              </button>
            ))}
          </div>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                category === c.key
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-2 text-4xl">🔔</div>
            <p className="font-medium text-gray-700 dark:text-gray-200">Aucune notification</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {status === "unread" || category !== "all"
                ? "Rien ne correspond à ces filtres."
                : "Vous êtes à jour."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([label, group]) => (
              <section key={label}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 first-letter:uppercase">
                  {label}
                </h3>
                <ul className="space-y-2">
                  {group.map((n) => (
                    <li
                      key={n.id}
                      className={`group flex items-start gap-3 rounded-xl border p-3 transition sm:p-4 ${rowTone(n)}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpen(n)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${iconTone(n)}`}
                        >
                          {TYPE_ICON[n.type] ?? "🔔"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-white/90">{n.title}</span>
                            {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Non lue" />}
                          </span>
                          <span className="mt-0.5 block text-sm text-gray-600 dark:text-gray-400">{n.body}</span>
                          <span
                            className="mt-1 block text-xs text-gray-400 dark:text-gray-500"
                            title={n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : undefined}
                          >
                            {relativeTime(n.created_at)}
                          </span>
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n)}
                            title="Marquer comme lu"
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-white hover:text-brand-500 dark:hover:bg-white/10"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(n)}
                          title="Supprimer"
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-white hover:text-red-500 dark:hover:bg-white/10"
                        >
                          🗑
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {page < lastPage && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => load(page + 1)}
                  disabled={loadingMore}
                  className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  {loadingMore ? "Chargement…" : `Charger plus (${total - items.length} restantes)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
