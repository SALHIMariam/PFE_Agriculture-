import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import {
  getAdminStats,
  getAnalysesMonthly,
  getTopDiseases,
  getRegionalMap,
  type AdminStats,
  type AnalysesMonthlyEntry,
  type TopDiseaseEntry,
  type RegionData,
} from "../../services/adminDashboardService";
import { getQueue } from "../../services/copilotService";
import type { Analysis } from "../../services/analysisService";
import { getMeetings, type Meeting } from "../../services/meetingService";
import { getNews, type NewsItem } from "../../services/newsService";
import TunisiaRiskMap from "../../components/maps/TunisiaRiskMap";
import { RISK_COLORS, riskColor } from "../../components/maps/riskColors";
import { diseaseNameFr, formatDiseaseLabel } from "../../data/diseaseLabels";

function StatCard({
  label,
  value,
  icon,
  subtext,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: string;
  subtext?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40 md:p-6"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-500/10">
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
          {value}
        </h4>
        {subtext && <p className="mt-1 text-xs text-gray-400">{subtext}</p>}
      </div>
    </button>
  );
}

function TrendSubtext({ delta, label }: { delta: number; label: string }) {
  const color = delta > 0 ? "#40916c" : delta < 0 ? "#e04f5f" : "#9ca3af";
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <span style={{ color }}>
      {arrow} {Math.abs(delta)} {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WIDGET — Top 5 maladies (barres de progression)
// ─────────────────────────────────────────────────────────────────────────

const DISEASE_RANK_COLORS = ["#e24b4a", "#eda100", "#eab308", "#40916c", "#2a78d6"];


function TopDiseasesWidget({
  topDiseases,
  totalAnalyses,
  navigate,
}: {
  topDiseases: TopDiseaseEntry[];
  totalAnalyses: number | null;
  navigate: (path: string) => void;
}) {
  const maxCount = Math.max(1, ...topDiseases.map((d) => d.count));
  const base = totalAnalyses ?? topDiseases.reduce((sum, d) => sum + d.count, 0) ?? 1;

  return (
    <div
      onClick={() => navigate("/dashboard/heatmap")}
      className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">🦠 Top 5 maladies</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/5 dark:text-gray-400">
          ce mois
        </span>
      </div>

      {topDiseases.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée.</p>
      ) : (
        <div className="space-y-4">
          {topDiseases.map((d, i) => {
            const color = DISEASE_RANK_COLORS[i] ?? DISEASE_RANK_COLORS[DISEASE_RANK_COLORS.length - 1];
            const widthPct = (d.count / maxCount) * 100;
            const percentOfTotal = base > 0 ? Math.round((d.count / base) * 100) : 0;

            return (
              <div key={d.disease} className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {diseaseNameFr(d.disease)}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gray-800 dark:text-white/90">
                      {d.count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${widthPct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-400">{percentOfTotal}% du total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WIDGET 1 — Carte des risques + top 5 gouvernorats (données réelles regionalMap)
// ─────────────────────────────────────────────────────────────────────────

function RiskMapWidget({ regions, navigate }: { regions: RegionData[]; navigate: (path: string) => void }) {
  const topRisk = [...regions]
    .filter((r) => r.total_analyses > 0)
    .sort((a, b) => b.risk_percentage - a.risk_percentage)
    .slice(0, 5);
  const hottest = topRisk[0];

  return (
    <div
      onClick={() => navigate("/dashboard/heatmap")}
      className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Vue régionale</p>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Propagation des maladies — Tunisie
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#1b4332] px-3 py-1.5 text-xs font-semibold text-white transition-transform group-hover:-translate-x-1">
          Ouvrir la carte →
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        <div className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#f1f8f3] to-[#faf8f4] px-6 py-3 dark:from-white/[0.03] dark:to-transparent">
          <TunisiaRiskMap regions={regions} highlight={hottest?.governorate} height={230} />
        </div>

        <div className="flex w-full min-w-0 flex-col">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            Top 5 gouvernorats à risque
          </p>
          {topRisk.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune donnée régionale disponible.</p>
          ) : (
            <div className="space-y-3">
              {topRisk.map((r) => {
                const color = riskColor(r.risk_percentage);

                return (
                  <div key={r.governorate} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{r.governorate}</span>
                      {r.top_disease && (
                        <span className="ml-2 truncate text-xs italic text-gray-400">
                          {diseaseNameFr(r.top_disease)}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.risk_percentage}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold" style={{ color }}>
                        {r.risk_percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-4 pt-4 text-xs text-gray-400">
            {[
              { label: "Faible", color: RISK_COLORS.low },
              { label: "Moyen", color: RISK_COLORS.medium },
              { label: "Élevé", color: RISK_COLORS.high },
              { label: "Sans donnée", color: RISK_COLORS.none },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WIDGET 2 — Mini-calendrier des réunions
// ─────────────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function formatMeetingDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MeetingsCalendarWidget({ meetings, navigate }: { meetings: Meeting[]; navigate: (path: string) => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lundi

  const meetingsByDay = useMemo(() => {
    const map = new Map<number, Meeting[]>();
    for (const m of meetings) {
      const d = new Date(m.scheduled_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const list = map.get(day) ?? [];
        list.push(m);
        map.set(day, list);
      }
    }
    return map;
  }, [meetings, year, month]);

  const upcoming = meetings.slice(0, 3);

  return (
    <div
      onClick={() => navigate("/dashboard/calendar")}
      className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        📹 Prochaines réunions
      </h3>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayMeetings = meetingsByDay.get(day);
          const hasMeeting = !!dayMeetings && dayMeetings.length > 0;

          return (
            <div key={day} className="group relative flex justify-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  hasMeeting
                    ? "bg-brand-500 font-semibold text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {day}
              </span>
              {hasMeeting && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-[180px] -translate-x-1/2 rounded-lg bg-gray-900 px-2 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                  {dayMeetings!.map((m) => (
                    <p key={m.id}>
                      {m.title} · {formatMeetingDateTime(m.scheduled_at).split(" ")[1]}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune réunion ce mois</p>
        ) : (
          upcoming.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-700 dark:text-gray-300">📹 {m.title}</span>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {formatMeetingDateTime(m.scheduled_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WIDGET 3 — Cartes actualités
// ─────────────────────────────────────────────────────────────────────────

const NEWS_BADGE: Record<string, string> = {
  alert: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  new_disease: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  new_treatment: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  trend: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  info: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
};

const NEWS_LABEL: Record<string, string> = {
  alert: "Alerte",
  new_disease: "Nouvelle maladie",
  new_treatment: "Traitement",
  trend: "Tendance",
  info: "Info",
};

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.floor(diffMs / 3600000);

  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "hier";
  return `il y a ${diffD}j`;
}

function NewsWidget({ news, navigate }: { news: NewsItem[]; navigate: (path: string) => void }) {
  return (
    <div
      onClick={() => navigate("/dashboard/news")}
      className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">📰 Actualités</h3>

      {news.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune actualité disponible.</p>
      ) : (
        <div className="space-y-3">
          {news.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 rounded-xl border border-gray-100 p-3 dark:border-gray-800"
            >
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${NEWS_BADGE[n.category] ?? NEWS_BADGE.info}`}
                >
                  {NEWS_LABEL[n.category] ?? n.category}
                </span>
                <p className="mt-1.5 line-clamp-2 text-sm font-medium text-gray-800 dark:text-white/90">
                  {n.title}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {n.source_name} · {formatRelativeDate(n.published_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(n.url, "_blank", "noopener,noreferrer");
                }}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/5"
                aria-label="Ouvrir l'article"
                title="Ouvrir l'article"
              >
                ↗
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WIDGET 4 — File Assistant AI
// ─────────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["bg-brand-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-pink-500"];

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

function avatarColor(name: string | null): string {
  const sum = (name ?? "?").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}


const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  important: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  normal: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
};

const PRIORITY_BAR: Record<string, string> = {
  urgent: "bg-red-500",
  important: "bg-amber-500",
  normal: "bg-brand-500",
};

function CopilotQueueWidget({ queue, navigate }: { queue: Analysis[]; navigate: (path: string) => void }) {
  return (
    <div
      onClick={() => navigate("/dashboard/copilot")}
      className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">🤖 File Assistant AI</h3>
        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
          {queue.length} analyse{queue.length > 1 ? "s" : ""} en attente
        </span>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun brouillon en attente.</p>
      ) : (
        <div className="space-y-3">
          {queue.map((a) => {
            const level = a.priority_level ?? "normal";
            const score = a.confidence_score ?? 0;

            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(a.farmer_name)}`}
                >
                  {initials(a.farmer_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {a.farmer_name?.trim() || "—"} · {a.predicted_class ? formatDiseaseLabel(a.predicted_class) : "—"}
                    </p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[level]}`}>
                      {level}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full ${PRIORITY_BAR[level]}`}
                      style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [monthly, setMonthly] = useState<AnalysesMonthlyEntry[]>([]);
  const [topDiseases, setTopDiseases] = useState<TopDiseaseEntry[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [copilotQueue, setCopilotQueue] = useState<Analysis[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => setStats(null));
    getAnalysesMonthly().then(setMonthly).catch(() => setMonthly([]));
    getTopDiseases().then(setTopDiseases).catch(() => setTopDiseases([]));
    getRegionalMap().then(setRegions).catch(() => setRegions([]));
    getQueue({ sort: "priority", status: "pending" })
      .then((res) => setCopilotQueue(res.data.slice(0, 5)))
      .catch(() => setCopilotQueue([]));

    const today = new Date().toISOString().split("T")[0];
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    getMeetings(today, in30Days)
      .then((res) => setMeetings(res.slice(0, 3)))
      .catch(() => setMeetings([]));

    getNews({ per_page: 4 })
      .then((res) => setNews(res.data))
      .catch(() => setNews([]));
  }, []);

  const chartOptions: ApexOptions = {
    colors: ["#40916c", "#f59e0b", "#ef4444"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      stacked: true,
      height: 260,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "45%", borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    xaxis: { categories: monthly.map((m) => m.month) },
    legend: { show: true, position: "top", horizontalAlign: "left" },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
  };
  const chartSeries = [
    { name: "Validées", data: monthly.map((m) => m.validated) },
    { name: "En attente", data: monthly.map((m) => m.pending) },
    { name: "Rejetées", data: monthly.map((m) => m.rejected) },
  ];

  return (
    <>
      <PageMeta
        title="Tableau de bord | AgriNova"
        description="Tableau de bord administrateur AgriNova — vue d'ensemble des analyses, validations et risques"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <StatCard
          label="Total analyses"
          value={stats ? stats.total_analyses.toLocaleString("fr-FR") : "—"}
          icon="🌿"
          subtext={stats ? <TrendSubtext delta={stats.trends.analyses_delta} label="vs 30j précédents" /> : undefined}
          onClick={() => navigate("/dashboard/analyses")}
        />
        <StatCard
          label="Agriculteurs actifs"
          value={stats ? stats.total_farmers.toLocaleString("fr-FR") : "—"}
          icon="👨‍🌾"
          subtext={stats ? <TrendSubtext delta={stats.trends.farmers_delta} label="vs 30j précédents" /> : undefined}
          onClick={() => navigate("/dashboard/users")}
        />
        <StatCard
          label="En attente"
          value={stats ? stats.pending_validation.toLocaleString("fr-FR") : "—"}
          icon="⏳"
          subtext={stats ? `+ ${stats.validated_today} validées aujourd'hui` : undefined}
          onClick={() => navigate("/dashboard/expert/analyses")}
        />
        <StatCard
          label="Précision du modèle"
          value={`${stats?.accuracy_score ?? 0}%`}
          icon="🎯"
          subtext={stats ? "EfficientNetB0 · 1 modèle actif" : undefined}
          onClick={() => navigate("/dashboard/copilot")}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        {/* Analyses par mois */}
        <div
          onClick={() => navigate("/dashboard/analyses")}
          className="cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-2"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Analyses par mois
          </h3>
          <Chart options={chartOptions} series={chartSeries} type="bar" height={260} />
        </div>

        <TopDiseasesWidget
          topDiseases={topDiseases}
          totalAnalyses={stats?.total_analyses ?? null}
          navigate={navigate}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
        <RiskMapWidget regions={regions} navigate={navigate} />
        <CopilotQueueWidget queue={copilotQueue} navigate={navigate} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
        <MeetingsCalendarWidget meetings={meetings} navigate={navigate} />
        <NewsWidget news={news} navigate={navigate} />
      </div>
    </>
  );
}
