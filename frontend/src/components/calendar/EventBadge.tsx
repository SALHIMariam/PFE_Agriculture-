import type { CalendarEvent } from "../../services/calendarService";

/** Pill compacte affichée dans une cellule du calendrier. */
export default function EventBadge({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
        if (event.type === "meeting" && typeof event.meta.meet_link === "string") {
          window.open(event.meta.meet_link, "_blank", "noopener,noreferrer");
        }
      }}
      title={`${event.title} — ${event.subtitle}`}
      className="flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight text-white/95 hover:brightness-95"
      style={{ backgroundColor: event.color }}
    >
      <span className="shrink-0">{event.icon}</span>
      <span className="truncate">{event.title}</span>
    </button>
  );
}
