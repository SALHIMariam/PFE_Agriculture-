import type { CalendarEvent } from "../../services/calendarService";
import EventBadge from "./EventBadge";
import type { MonthCell } from "./calendarConstants";

const MAX_INLINE = 3;

export default function DayCell({
  cell,
  events,
  isToday,
  isSelected,
  onSelect,
}: {
  cell: MonthCell;
  events: CalendarEvent[];
  isToday: boolean;
  isSelected: boolean;
  onSelect: (key: string) => void;
}) {
  const hasUrgent = events.some(
    (e) => e.type === "risk_alert" && (e.meta.risk_level === "urgent" || e.color === "#F44336"),
  );

  const visible = events.slice(0, MAX_INLINE);
  const extra = events.length - visible.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(cell.key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(cell.key);
        }
      }}
      className={`flex min-h-[104px] cursor-pointer flex-col gap-1 border-b border-r border-gray-100 p-1.5 text-left transition hover:shadow-inner dark:border-white/[0.06] ${
        cell.inMonth
          ? "bg-white dark:bg-white/[0.02]"
          : "bg-gray-50/60 text-gray-400 dark:bg-white/[0.01]"
      } ${hasUrgent ? "bg-red-50/70 dark:bg-red-500/[0.06]" : ""} ${
        isSelected ? "ring-2 ring-inset ring-brand-500" : ""
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
          isToday
            ? "bg-brand-500 font-bold text-white"
            : cell.inMonth
              ? "font-medium text-gray-700 dark:text-gray-300"
              : "text-gray-400"
        }`}
      >
        {cell.date.getDate()}
      </span>

      <div className="flex flex-col gap-0.5">
        {visible.map((e) => (
          <EventBadge key={e.id} event={e} onClick={() => onSelect(cell.key)} />
        ))}
        {extra > 0 && (
          <span className="px-1.5 text-[11px] font-medium text-brand-500">+{extra} autres</span>
        )}
      </div>
    </div>
  );
}
