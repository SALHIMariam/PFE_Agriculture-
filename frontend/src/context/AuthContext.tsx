import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { User } from "../services/authService";
import * as authService from "../services/authService";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, passwordConfirmation: string, farm?: string, crops?: string[], farmProfile?: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loginPromiseRef = useRef<Promise<User> | null>(null);
  const registerPromiseRef = useRef<Promise<User> | null>(null);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // getCurrentUser() is deduplicated at the service layer — safe to call
    // directly here without an extra ref guard.
    authService.getCurrentUser()
      .then((u) => { if (!cancelled) { setUser(u); setLoading(false); } })
      .catch(() => { if (!cancelled) { setUser(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (loginPromiseRef.current) return loginPromiseRef.current;

    loginPromiseRef.current = authService.login(email, password)
      .then((loggedUser) => {
        setUser(loggedUser);
        return loggedUser;
      })
      .finally(() => {
        loginPromiseRef.current = null;
      });

    return loginPromiseRef.current;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, passwordConfirmation: string, farm?: string, crops?: string[], farmProfile?: string) => {
      if (registerPromiseRef.current) return registerPromiseRef.current;

      registerPromiseRef.current = authService.register(name, email, password, passwordConfirmation, farm, crops, farmProfile)
        .then((newUser) => {
          setUser(newUser);
          return newUser;
        })
        .finally(() => {
          registerPromiseRef.current = null;
        });

      return registerPromiseRef.current;
    },
    []
  );

  const logout = useCallback(async () => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;

    logoutPromiseRef.current = authService.logout()
      .then(() => {
        setUser(null);
      })
      .finally(() => {
        logoutPromiseRef.current = null;
      });

    return logoutPromiseRef.current;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
