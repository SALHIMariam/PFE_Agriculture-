import { useState } from "react";
import {
  deleteNote,
  type CalendarEvent,
  type DayStats,
} from "../../services/calendarService";
import AddNoteForm from "./AddNoteForm";
import { EVENT_TYPE_META, fullDateLabel } from "./calendarConstants";
import { formatDiseaseLabel } from "../../data/diseaseLabels";

type Notify = (message: string, kind: "success" | "error") => void;

type RiskZone = {
  governorate: string;
  crop: string;
  disease_short: string;
  risk_score: number;
  risk_level: string | null;
};

function riskZones(event: CalendarEvent): RiskZone[] {
  const zones = event.meta.zones;
  return Array.isArray(zones) ? (zones as RiskZone[]) : [];
}

function StatRow({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white/90">
        {value}
        <span>{icon}</span>
      </span>
    </div>
  );
}

function metaLine(event: CalendarEvent): string | null {
  const m = event.meta;
  switch (event.type) {
    case "analysis":
      // Grouped events (see CalendarController) already say "N en attente de
      // validation" in the subtitle shown just above — avoid repeating it.
      return m.confidence != null ? `Confiance ${String(m.confidence)}%` : null;
    case "validation":
      return m.status ? `Statut : ${String(m.status)}` : null;
    case "risk_alert":
      if (m.zone_count != null)
        return `${String(m.zone_count)} zone(s) · pic ${String(m.max_score)}%`;
      return m.risk_score != null ? `Score de risque ${String(m.risk_score)}%` : null;
    case "farmer_question":
      return m.count != null ? `${String(m.count)} message(s)` : null;
    case "note":
      return typeof m.author_name === "string" ? `Par ${m.author_name}` : null;
    case "copilot":
      return m.count != null ? `${String(m.count)} analyse(s)` : null;
    case "meeting":
      return m.duration_minutes != null ? `${String(m.duration_minutes)} min` : null;
    default:
      return null;
  }
}

export default function DayDetailPanel({
  date,
  events,
  stats,
  statsLoading,
  statsError,
  currentUserId,
  isAdmin,
  onNoteChanged,
  notify,
}: {
  date: string | null;
  events: CalendarEvent[];
  stats: DayStats | null;
  statsLoading: boolean;
  statsError: boolean;
  currentUserId: number;
  isAdmin: boolean;
  onNoteChanged: () => void;
  notify: Notify;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (!date) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400">
        Sélectionnez un jour pour voir le détail et ajouter une note.
      </div>
    );
  }

  const dayEvents = events.filter((e) => e.date === date);

  const canDelete = (event: CalendarEvent): boolean =>
    event.type === "note" && (isAdmin || event.meta.author_id === currentUserId);

  const handleDelete = async (event: CalendarEvent) => {
    const noteId = Number(event.meta.note_id);
    if (!noteId) return;
    setDeletingId(noteId);
    try {
      await deleteNote(noteId);
      notify("Note supprimée", "success");
      onNoteChanged();
    } catch {
      notify("Suppression impossible.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* En-tête fixe — ne défile pas */}
      <div className="shrink-0 border-b border-gray-100 px-4 pb-3 pt-4 dark:border-white/[0.06]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          📅 {fullDateLabel(date)}
        </h3>
      </div>

      {/* Contenu défilant */}
      <div className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">

      {/* Stats du jour */}
      <div className="rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]">
        {statsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Chargement des statistiques…
          </div>
        ) : statsError || !stats ? (
          <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
            Statistiques indisponibles pour ce jour.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            <StatRow label="Analyses" value={stats.analyses.total} icon="🌿" />
            <StatRow label="Maladies détectées" value={stats.analyses.diseases_detected} icon="🔴" />
            <StatRow label="Saines" value={stats.analyses.healthy} icon="🟢" />
            <StatRow label="Validations" value={stats.validations.total} icon="✅" />
            <StatRow label="En attente de validation" value={stats.analyses.pending_validation} icon="⏳" />
            <StatRow label="Alertes de risque" value={stats.risk_alerts.total} icon="🚨" />
            <StatRow label="Questions sans réponse" value={stats.questions.unanswered} icon="💬" />
          </div>
        )}
      </div>

      {/* Liste des événements */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Événements ({dayEvents.length})
        </p>
        {dayEvents.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucun événement ce jour.</p>
        )}
        {dayEvents.map((event) => {
          const meta = EVENT_TYPE_META[event.type];
          const extra = metaLine(event);
          return (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-white/[0.06]"
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: `${event.color}22` }}
              >
                {event.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  {event.title}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {event.subtitle}
                </p>
                {extra && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{extra}</p>
                )}
                {event.type === "risk_alert" && riskZones(event).length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {riskZones(event)
                      .slice(0, 8)
                      .map((z) => (
                        <li
                          key={`${z.governorate}-${z.disease_short}`}
                          className="text-xs text-gray-500 dark:text-gray-400"
                        >
                          📍 {z.governorate} — {formatDiseaseLabel(`${z.crop}__${z.disease_short}`)} ·{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {z.risk_score}%
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              {event.type === "meeting" && typeof event.meta.meet_link === "string" && (
                <a
                  href={event.meta.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-violet-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-600"
                >
                  Rejoindre
                </a>
              )}
              {canDelete(event) && (
                <button
                  type="button"
                  onClick={() => handleDelete(event)}
                  disabled={deletingId === Number(event.meta.note_id)}
                  className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-500/10"
                  title="Supprimer la note"
                >
                  🗑
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Ajout de note */}
      <AddNoteForm date={date} onNoteAdded={onNoteChanged} notify={notify} />

      </div>
    </div>
  );
}
