import type { CalendarEventType } from "../../services/calendarService";

export type TypeMeta = {
  label: string;
  icon: string;
  /** Classe Tailwind pour le badge « type » dans le panneau détail. */
  badgeClass: string;
};

export const EVENT_TYPE_META: Record<CalendarEventType, TypeMeta> = {
  analysis: {
    label: "Analyse",
    icon: "🌿",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  },
  validation: {
    label: "Validation",
    icon: "👨‍🔬",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  },
  risk_alert: {
    label: "Alerte AI",
    icon: "🚨",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
  farmer_question: {
    label: "Question",
    icon: "💬",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  },
  note: {
    label: "Note",
    icon: "📝",
    badgeClass: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
  },
  copilot: {
    label: "Assistant AI",
    icon: "🤖",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  },
  meeting: {
    label: "Meeting",
    icon: "📹",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  },
};

/** Ordre d'affichage des filtres. */
export const FILTERABLE_TYPES: CalendarEventType[] = [
  "analysis",
  "validation",
  "risk_alert",
  "farmer_question",
  "note",
  "copilot",
  "meeting",
];

/** Presets de couleur pour les notes manuelles. */
export const NOTE_COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "#4CAF50", label: "Suivi normal" },
  { value: "#2196F3", label: "Information" },
  { value: "#FF9800", label: "Attention" },
  { value: "#F44336", label: "Urgent" },
  { value: "#9C27B0", label: "Important" },
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export { WEEKDAYS };

/** Clé locale YYYY-MM-DD (sans décalage de fuseau, contrairement à toISOString). */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

/** Lundi = 0 … Dimanche = 6. */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function monthLabel(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export function fullDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export type MonthCell = { date: Date; key: string; inMonth: boolean };

/** Grille de semaines complètes (Lun→Dim) couvrant tout le mois. */
export function buildMonthGrid(year: number, month0: number): MonthCell[] {
  const first = new Date(year, month0, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex(first));

  const last = new Date(year, month0 + 1, 0);
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - mondayIndex(last)));

  const cells: MonthCell[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    cells.push({
      date: new Date(cursor),
      key: dateKey(cursor),
      inMonth: cursor.getMonth() === month0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}
