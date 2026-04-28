import api from "../api/client";

export type User = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  farm?: string;
  farm_profile?: string;
  is_active?: boolean;
  crops?: string[] | null;
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

export async function login(email: string, password: string): Promise<User> {
  await ensureCSRFToken();
  const response = await api.post("/api/login", { email, password });
  mePromise = null;
  return response.data.user ?? response.data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
  farm?: string,
  crops?: string[],
  farmProfile?: string,
): Promise<User> {
  await ensureCSRFToken();
  const response = await api.post("/api/register", {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
    farm,
    crops,
    farm_profile: farmProfile,
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
