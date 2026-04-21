import api from "../api/client";

export type User = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  farm?: string;
  farm_profile?: string;
  is_active?: boolean;
};

export async function login(email: string, password: string): Promise<User> {
  // 1. Récupérer le cookie CSRF (nécessaire pour Sanctum SPA)
  await api.get("/sanctum/csrf-cookie");

  // 2. Se connecter — la session cookie est créée automatiquement
  await api.post("/api/login", { email, password });

  // 3. Récupérer l'utilisateur connecté
  const { data } = await api.get("/api/me");
  return data.user;
}

export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string
): Promise<User> {
  await api.get("/sanctum/csrf-cookie");

  await api.post("/api/register", {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });

  const { data } = await api.get("/api/me");
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/logout");
  } catch (error: any) {
    if (error.response?.status !== 401) {
      throw error;
    }
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get("/api/me");
    return data.user;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null; // Pas de session active — comportement normal
    }
    throw error;
  }
}
