import api from "../api/client";

declare global {
  interface Window {
    __AGRINOVA_LOGIN_PROMISE__?: Promise<User> | null;
    __AGRINOVA_LOGOUT_PROMISE__?: Promise<void> | null;
  }
}

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
  if (window.__AGRINOVA_LOGIN_PROMISE__) {
    console.log("AUTH_SERVICE_LOGIN_REUSED_EXISTING_PROMISE");
    return window.__AGRINOVA_LOGIN_PROMISE__;
  }

  console.log("AUTH_SERVICE_LOGIN_NETWORK_STARTED");

  window.__AGRINOVA_LOGIN_PROMISE__ = (async () => {
    await api.get("/sanctum/csrf-cookie");

    const response = await api.post("/api/login", {
      email,
      password,
    });

    return response.data.user ?? response.data;
  })();

  try {
    return await window.__AGRINOVA_LOGIN_PROMISE__;
  } finally {
    window.__AGRINOVA_LOGIN_PROMISE__ = null;
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string
): Promise<User> {
  await api.get("/sanctum/csrf-cookie");

  const response = await api.post("/api/register", {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });

  return response.data.user ?? response.data;
}

export async function logout(): Promise<void> {
  if (window.__AGRINOVA_LOGOUT_PROMISE__) {
    console.log("AUTH_SERVICE_LOGOUT_REUSED_EXISTING_PROMISE");
    return window.__AGRINOVA_LOGOUT_PROMISE__;
  }

  console.log("AUTH_SERVICE_LOGOUT_NETWORK_STARTED");

  window.__AGRINOVA_LOGOUT_PROMISE__ = (async () => {
    try {
      await api.post("/api/logout");
    } catch (error: any) {
      if (error.response?.status !== 401) {
        throw error;
      }
    }
  })();

  try {
    return await window.__AGRINOVA_LOGOUT_PROMISE__;
  } finally {
    window.__AGRINOVA_LOGOUT_PROMISE__ = null;
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
