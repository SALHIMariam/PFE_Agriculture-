import api from "../api/client";

export type CalendarEventType =
  | "analysis"
  | "validation"
  | "risk_alert"
  | "farmer_question"
  | "note"
  | "copilot"
  | "meeting";

export type CalendarEventMeta = Record<
  string,
  string | number | boolean | null | unknown[] | Record<string, unknown>
>;

export type CalendarEvent = {
  type: CalendarEventType;
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  subtitle: string;
  color: string; // hex
  icon: string; // emoji
  meta: CalendarEventMeta;
};

export type CalendarSummary = {
  total_analyses: number;
  total_validations: number;
  total_risk_alerts: number;
  total_questions: number;
  total_notes: number;
  pending_validations: number;
};

export type CalendarEventsResponse = {
  events: CalendarEvent[];
  summary: CalendarSummary;
};

export type DayStats = {
  date: string;
  analyses: {
    total: number;
    diseases_detected: number;
    healthy: number;
    pending_validation: number;
  };
  validations: {
    total: number;
    validated: number;
    rejected: number;
  };
  risk_alerts: {
    total: number;
    urgent: number;
    high_risk_zones: { governorate: string; disease: string; risk_score: number | null }[];
  };
  questions: {
    total: number;
    unanswered: number;
    in_progress: number;
    resolved: number;
  };
};

export type CalendarNote = {
  id: number;
  date: string;
  content: string;
  color: string;
  author: string;
};

export async function getCalendarEvents(
  year: number,
  month: number,
): Promise<CalendarEventsResponse> {
  const { data } = await api.get("/api/calendar/events", { params: { year, month } });
  return data as CalendarEventsResponse;
}

export async function getDayStats(date: string): Promise<DayStats> {
  const { data } = await api.get("/api/calendar/day-stats", { params: { date } });
  return data as DayStats;
}

export async function addNote(payload: {
  date: string;
  content: string;
  color: string;
}): Promise<{ note: CalendarNote }> {
  const { data } = await api.post("/api/calendar/notes", payload);
  return data as { note: CalendarNote };
}

export async function deleteNote(noteId: number): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/calendar/notes/${noteId}`);
  return data as { message: string };
}
