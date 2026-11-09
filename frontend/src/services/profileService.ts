import api from "../api/client";
import type { NotificationPreferences, User } from "./authService";

export type ProfileUpdatePayload = Partial<{
  name: string;
  first_name: string;
  last_name: string;
  farm: string | null;
  email: string;
  governorate: string | null;
  crops: string[];
  farm_profile: "Small" | "Medium" | "Large" | null;
  irrigation_system: string | null;
  main_season: string | null;
  surface_ha: number | null;
  language: "fr" | "en" | "ar";
  two_factor_enabled: boolean;
}>;

export async function getProfile(): Promise<User> {
  const { data } = await api.get("/api/profile");
  return data.user as User;
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
  const { data } = await api.put("/api/profile", payload);
  return data.user as User;
}

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const { data } = await api.put("/api/user/notification-preferences", {
    notification_preferences: preferences,
  });
  return data.notification_preferences as NotificationPreferences;
}

export async function updateLanguagePreference(language: string): Promise<User> {
  const { data } = await api.put("/api/user/preferences", { language });
  return data.user as User;
}

export async function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await api.put("/api/profile/password", payload);
}

export async function uploadAvatar(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("avatar", file);
  const { data } = await api.post("/api/profile/avatar", fd);
  return data.avatar_url as string;
}
