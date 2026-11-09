import { useMemo } from "react";
import type { CalendarEvent } from "../../services/calendarService";
import DayCell from "./DayCell";
import { WEEKDAYS, buildMonthGrid, dateKey } from "./calendarConstants";

export default function CalendarGrid({
  year,
  month0,
  events,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month0: number;
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (key: string) => void;
}) {
  const cells = useMemo(() => buildMonthGrid(year, month0), [year, month0]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [events]);

  const todayKey = dateKey(new Date());

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/[0.06]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => (
          <DayCell
            key={cell.key}
            cell={cell}
            events={eventsByDay.get(cell.key) ?? []}
            isToday={cell.key === todayKey}
            isSelected={cell.key === selectedDate}
            onSelect={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}
