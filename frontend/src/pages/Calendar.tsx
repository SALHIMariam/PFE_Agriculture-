import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import {
  getCalendarEvents,
  getDayStats,
  type CalendarEvent,
  type CalendarEventType,
  type CalendarSummary,
  type DayStats,
} from "../services/calendarService";
import { getDailyStats, type CopilotDailyStat } from "../services/copilotService";
import {
  disconnectGoogle,
  getGoogleAuthUrl,
  getGoogleStatus,
  getMeetings,
  type Meeting,
} from "../services/meetingService";
import CalendarGrid from "../components/calendar/CalendarGrid";
import DayDetailPanel from "../components/calendar/DayDetailPanel";
import MonthSummaryBar from "../components/calendar/MonthSummaryBar";
import ScheduleMeetingModal from "../components/calendar/ScheduleMeetingModal";
import {
  EVENT_TYPE_META,
  FILTERABLE_TYPES,
  dateKey,
  monthLabel,
} from "../components/calendar/calendarConstants";

type Toast = { message: string; kind: "success" | "error" } | null;

export default function Calendar() {
  const { user } = useAuth();
  const isAdmin = (user?.roles?.[0] ?? "") === "admin";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copilotStats, setCopilotStats] = useState<CopilotDailyStat[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  const [visibleTypes, setVisibleTypes] = useState<Set<CalendarEventType>>(
    () => new Set(FILTERABLE_TYPES),
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayStats, setDayStats] = useState<DayStats | null>(null);
  const [dayStatsLoading, setDayStatsLoading] = useState(false);
  const [dayStatsError, setDayStatsError] = useState(false);

  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string, kind: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Statut de connexion Google Calendar (admin uniquement) ──
  useEffect(() => {
    if (!isAdmin) return;
    getGoogleStatus()
      .then((res) => setGoogleConnected(res.connected))
      .catch(() => setGoogleConnected(false));
  }, [isAdmin]);

  const [reloadKey, setReloadKey] = useState(0);

  // ── Hauteur du panneau détail alignée sur la grille (desktop uniquement) ──
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)"); // = breakpoint `lg`
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setGridHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, year, month0]);

  const panelHeight = isDesktop && gridHeight ? `${gridHeight}px` : undefined;

  // ── Chargement des événements du mois ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCalendarEvents(year, month0 + 1)
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events);
        setSummary(res.summary);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les événements.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month0, reloadKey]);

  // ── Chargement des statistiques Assistant AI du mois ──
  useEffect(() => {
    let cancelled = false;
    const from = new Date(year, month0, 1).toISOString().split("T")[0];
    const to = new Date(year, month0 + 1, 0).toISOString().split("T")[0];
    getDailyStats(from, to)
      .then((res) => {
        if (!cancelled) setCopilotStats(res);
      })
      .catch(() => {
        if (!cancelled) setCopilotStats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month0, reloadKey]);

  // ── Transforme les stats Assistant AI en événements calendrier ──
  const copilotEvents = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];
    for (const day of copilotStats) {
      if (day.validated > 0) {
        result.push({
          type: "copilot",
          id: `copilot-validated-${day.date}`,
          date: day.date,
          title: `✅ ${day.validated} validée${day.validated > 1 ? "s" : ""}`,
          subtitle: "Réponses Assistant AI validées telles quelles",
          color: "#10b981",
          icon: "🤖",
          meta: { count: day.validated },
        });
      }
      if (day.edited > 0) {
        result.push({
          type: "copilot",
          id: `copilot-edited-${day.date}`,
          date: day.date,
          title: `✏️ ${day.edited} éditée${day.edited > 1 ? "s" : ""}`,
          subtitle: "Réponses Assistant AI éditées avant envoi",
          color: "#f59e0b",
          icon: "🤖",
          meta: { count: day.edited },
        });
      }
      if (day.rejected > 0) {
        result.push({
          type: "copilot",
          id: `copilot-rejected-${day.date}`,
          date: day.date,
          title: `❌ ${day.rejected} rejetée${day.rejected > 1 ? "s" : ""}`,
          subtitle: "Brouillons Assistant AI rejetés par l'expert",
          color: "#ef4444",
          icon: "🤖",
          meta: { count: day.rejected },
        });
      }
      if (day.prepared > 0 && day.total === 0) {
        result.push({
          type: "copilot",
          id: `copilot-prepared-${day.date}`,
          date: day.date,
          title: `🤖 ${day.prepared} préparée${day.prepared > 1 ? "s" : ""}`,
          subtitle: "Brouillons Assistant AI en attente de réponse",
          color: "#6366f1",
          icon: "🤖",
          meta: { count: day.prepared },
        });
      }
    }
    return result;
  }, [copilotStats]);

  // ── Chargement des meetings Google Meet du mois ──
  useEffect(() => {
    let cancelled = false;
    const from = new Date(year, month0, 1).toISOString().split("T")[0];
    const to = new Date(year, month0 + 1, 0).toISOString().split("T")[0];
    getMeetings(from, to)
      .then((res) => {
        if (!cancelled) setMeetings(res);
      })
      .catch(() => {
        if (!cancelled) setMeetings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month0, reloadKey]);

  // ── Transforme les meetings en événements calendrier ──
  const meetingEvents = useMemo<CalendarEvent[]>(
    () =>
      meetings.map((m) => ({
        type: "meeting",
        id: `meeting-${m.id}`,
        date: dateKey(new Date(m.scheduled_at)),
        title: `📹 ${m.title}`,
        subtitle: `${new Date(m.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${m.duration_minutes} min · ${m.invitees.length} invité(s)`,
        color: "#6366f1",
        icon: "📹",
        meta: {
          meet_link: m.meet_link,
          duration_minutes: m.duration_minutes,
          creator_name: m.creator.name,
        },
      })),
    [meetings],
  );

  // ── Chargement des stats du jour sélectionné ──
  useEffect(() => {
    if (!selectedDate) {
      setDayStats(null);
      return;
    }
    let cancelled = false;
    setDayStatsLoading(true);
    setDayStatsError(false);
    getDayStats(selectedDate)
      .then((res) => {
        if (!cancelled) setDayStats(res);
      })
      .catch(() => {
        if (!cancelled) {
          setDayStats(null);
          setDayStatsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDayStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, reloadKey]);

  const filteredEvents = useMemo(
    () => [...events, ...copilotEvents, ...meetingEvents].filter((e) => visibleTypes.has(e.type)),
    [events, copilotEvents, meetingEvents, visibleTypes],
  );

  const toggleType = (type: CalendarEventType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const goPrev = () => {
    const d = new Date(year, month0 - 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };
  const goNext = () => {
    const d = new Date(year, month0 + 1, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };
  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };

  const refreshAll = useCallback(() => setReloadKey((k) => k + 1), []);

  // ── Connexion Google via popup (évite de naviguer l'onglet principal, ce qui casserait la session Sanctum) ──
  const connectGoogle = useCallback(async () => {
    try {
      const url = await getGoogleAuthUrl();

      const popup = window.open(
        url,
        "google-oauth",
        "width=500,height=600,scrollbars=yes,resizable=yes",
      );

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
          setGoogleConnected(true);
          notify("Google Calendar connecté ✅", "success");
          window.removeEventListener("message", handleMessage);
          popup?.close();
        } else if (event.data?.type === "GOOGLE_AUTH_ERROR") {
          notify("Erreur de connexion Google", "error");
          window.removeEventListener("message", handleMessage);
          popup?.close();
        }
      };
      window.addEventListener("message", handleMessage);

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
        }
      }, 1000);
    } catch {
      notify("Erreur lors de la connexion Google", "error");
    }
  }, [notify]);

  return (
    <>
      <PageMeta title="Calendrier | AgriNova" description="Calendrier intelligent des événements AgriNova" />
      <PageBreadcrumb pageTitle="Calendrier" />

      {/* Header : navigation + titre */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold capitalize text-gray-800 dark:text-white/90">
          {monthLabel(year, month0)}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="h-9 w-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            aria-label="Mois précédent"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={goNext}
            className="h-9 w-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            aria-label="Mois suivant"
          >
            ›
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="ml-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              📹 Planifier un Meet
            </button>
          )}
          {isAdmin &&
            (googleConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  ✅ Google Meet connecté
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await disconnectGoogle();
                    setGoogleConnected(false);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Déconnecter
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={connectGoogle}
                className="flex items-center gap-2 rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-400 dark:hover:bg-blue-500/10"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Connecter Google Meet
              </button>
            ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERABLE_TYPES.map((type) => {
          const meta = EVENT_TYPE_META[type];
          const active = visibleTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-white/[0.03]"
              }`}
            >
              <span>{meta.icon}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Corps : calendrier + panneau détail */}
      {loading ? (
        <div className="h-[560px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-error-200 bg-error-50 p-8 text-center dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          <button
            type="button"
            onClick={refreshAll}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
          <div className="lg:col-span-2" ref={gridRef}>
            <CalendarGrid
              year={year}
              month0={month0}
              events={filteredEvents}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
          <div className="lg:col-span-1" style={{ height: panelHeight }}>
            <DayDetailPanel
              date={selectedDate}
              events={filteredEvents}
              stats={dayStats}
              statsLoading={dayStatsLoading}
              statsError={dayStatsError}
              currentUserId={user?.id ?? 0}
              isAdmin={isAdmin}
              onNoteChanged={refreshAll}
              notify={notify}
            />
          </div>
        </div>
      )}

      {/* Résumé du mois */}
      {!loading && !error && summary && (
        <div className="mt-4">
          <MonthSummaryBar summary={summary} />
        </div>
      )}

      {/* Résumé Assistant AI du mois */}
      {!loading && !error && copilotStats.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            🤖 Assistant AI — {monthLabel(year, month0)}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Validées",
                value: copilotStats.reduce((sum, d) => sum + d.validated, 0),
                icon: "✅",
              },
              {
                label: "Éditées",
                value: copilotStats.reduce((sum, d) => sum + d.edited, 0),
                icon: "✏️",
              },
              {
                label: "Rejetées",
                value: copilotStats.reduce((sum, d) => sum + d.rejected, 0),
                icon: "❌",
              },
              {
                label: "Préparées",
                value: copilotStats.reduce((sum, d) => sum + d.prepared, 0),
                icon: "🤖",
              },
            ].map((tile) => (
              <div
                key={tile.label}
                className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
              >
                <span className="text-lg">{tile.icon}</span>
                <div>
                  <div className="text-base font-semibold text-gray-800 dark:text-white/90">
                    {tile.value}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{tile.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de planification de meeting */}
      {scheduleModalOpen && (
        <ScheduleMeetingModal
          onClose={() => setScheduleModalOpen(false)}
          onCreated={refreshAll}
          notify={notify}
          googleConnected={googleConnected}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[99999] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-success-500" : "bg-error-500"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
