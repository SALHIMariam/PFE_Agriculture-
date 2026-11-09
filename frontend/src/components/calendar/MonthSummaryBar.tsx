import type { CalendarSummary } from "../../services/calendarService";

export default function MonthSummaryBar({ summary }: { summary: CalendarSummary }) {
  const items: { icon: string; label: string; value: number }[] = [
    { icon: "🌿", label: "Analyses", value: summary.total_analyses },
    { icon: "👨‍🔬", label: "Validations", value: summary.total_validations },
    { icon: "🚨", label: "Alertes AI", value: summary.total_risk_alerts },
    { icon: "💬", label: "Questions", value: summary.total_questions },
    { icon: "📝", label: "Notes", value: summary.total_notes },
    { icon: "⏳", label: "En attente", value: summary.pending_validations },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
        >
          <span className="text-lg">{it.icon}</span>
          <div>
            <div className="text-base font-semibold text-gray-800 dark:text-white/90">
              {it.value}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
