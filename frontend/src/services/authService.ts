import api from "../api/client";

export type ClimateZone = {
  key: "nord" | "centre" | "sud";
  label: string;
  color: "green" | "yellow" | "orange";
};

export type NotificationPreferences = {
  disease_alerts: boolean;
  high_risk: boolean;
  expert_validation: boolean;
  new_recommendations: boolean;
  followup_reminder: boolean;
  agri_news: boolean;
  alert_high_risk: boolean;
  alert_rising_region: boolean;
  alert_new_analysis_recommended: boolean;
  alert_expert_validates: boolean;
  alert_weather_unfavorable: boolean;
};

export type User = {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string;
  email: string;
  roles: string[];
  farm?: string;
  governorate?: string | null;
  farm_profile?: string;
  irrigation_system?: string | null;
  main_season?: string | null;
  surface_ha?: number | null;
  language?: string;
  notification_preferences?: NotificationPreferences;
  two_factor_enabled?: boolean;
  avatar_url?: string | null;
  climate_zone?: ClimateZone | null;
  is_active?: boolean;
  crops?: string[] | null;
  must_change_password?: boolean;
  last_login_at?: string | null;
  created_at?: string;
};

export type LoginResult = {
  user: User | null;
  mustChangePassword: boolean;
};

// Single shared CSRF fetch — concurrent callers wait on the same promise.
let csrfPromise: Promise<void> | null = null;
async function ensureCSRFToken(): Promise<void> {
  if (csrfPromise) return csrfPromise;
  csrfPromise = api.get("/sanctum/csrf-cookie").then(() => undefined);
  try {
    return await csrfPromise;
  } finally {
    csrfPromise = null;
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  await ensureCSRFToken();
  const response = await api.post("/api/login", { email, password });
  mePromise = null;
  return {
    user: response.data.user ?? null,
    mustChangePassword: Boolean(response.data.must_change_password),
  };
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  passwordConfirmation: string,
  farm?: string,
  crops?: string[],
  farmProfile?: string,
  governorate?: string,
): Promise<User> {
  await ensureCSRFToken();
  const response = await api.post("/api/register", {
    first_name: firstName,
    last_name: lastName,
    email,
    password,
    password_confirmation: passwordConfirmation,
    farm,
    crops,
    farm_profile: farmProfile,
    governorate,
  });
  mePromise = null;
  return response.data.user ?? response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/logout");
  } catch (error: any) {
    if (error.response?.status !== 401) {
      throw error;
    }
  } finally {
    mePromise = null;
  }
}

// Module-level cache — survives React StrictMode double-invocation and any
// other cause of simultaneous calls. Cleared on non-401 errors (allow retry),
// and explicitly reset by login/register/logout above.
let mePromise: Promise<User | null> | null = null;

export function getCurrentUser(): Promise<User | null> {
  if (mePromise) return mePromise;
  mePromise = api
    .get("/api/me")
    .then(({ data }) => (data.user as User | null) ?? null)
    .catch((error: any) => {
      if (error.response?.status === 401) return null;
      mePromise = null; // allow retry on network / server errors
      throw error;
    });
  return mePromise;
}

export async function forcePasswordChange(
  password: string,
  passwordConfirmation: string,
): Promise<User> {
  const response = await api.put("/api/profile/force-password", {
    password,
    password_confirmation: passwordConfirmation,
  });
  return response.data.user ?? response.data;
}
