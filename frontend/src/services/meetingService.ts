import api from "../api/client";

export type Meeting = {
  id: number;
  title: string;
  description: string | null;
  meet_link: string;
  scheduled_at: string;
  duration_minutes: number;
  status: "scheduled" | "cancelled";
  creator: { id: number; name: string };
  invitees: { id: number; name: string; email: string }[];
};

export type ExpertOption = { id: number; name: string; email: string };

export async function getMeetings(from: string, to: string): Promise<Meeting[]> {
  const { data } = await api.get("/api/meetings", { params: { from, to } });
  return data.meetings as Meeting[];
}

export async function getExperts(): Promise<ExpertOption[]> {
  const { data } = await api.get("/api/meetings/experts");
  return data.experts as ExpertOption[];
}

export async function createMeeting(payload: {
  title: string;
  description?: string;
  meet_link?: string;
  scheduled_at: string;
  duration_minutes: number;
  expert_ids: number[];
  send_now: boolean;
}): Promise<Meeting> {
  const { data } = await api.post("/api/meetings", payload);
  return data.meeting as Meeting;
}

export async function sendInvitations(meetingId: number): Promise<void> {
  await api.post(`/api/meetings/${meetingId}/send`);
}

export async function cancelMeeting(meetingId: number): Promise<void> {
  await api.delete(`/api/meetings/${meetingId}`);
}

export async function getGoogleAuthUrl(): Promise<string> {
  const { data } = await api.get("/api/google/auth-url");
  return data.url;
}

export async function getGoogleStatus(): Promise<{ connected: boolean }> {
  const { data } = await api.get("/api/google/status");
  return data;
}

export async function disconnectGoogle(): Promise<void> {
  await api.delete("/api/google/disconnect");
}
