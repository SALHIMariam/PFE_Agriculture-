import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { User, LoginResult } from "../services/authService";
import * as authService from "../services/authService";
import { setAppLanguage } from "../i18n";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (firstName: string, lastName: string, email: string, password: string, passwordConfirmation: string, farm?: string, crops?: string[], farmProfile?: string, governorate?: string) => Promise<User>;
  logout: () => Promise<void>;
  clearMustChangePassword: () => void;
  /** Merge freshly returned user fields into the cached user (after a profile/preferences save). */
  updateUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const loginPromiseRef = useRef<Promise<LoginResult> | null>(null);
  const registerPromiseRef = useRef<Promise<User> | null>(null);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // getCurrentUser() is deduplicated at the service layer — safe to call
    // directly here without an extra ref guard.
    authService.getCurrentUser()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setAppLanguage(u?.language);
          setMustChangePassword(Boolean(u?.must_change_password));
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) { setUser(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    if (patch.language) setAppLanguage(patch.language);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (loginPromiseRef.current) return loginPromiseRef.current;

    loginPromiseRef.current = authService.login(email, password)
      .then((result) => {
        setUser(result.user);
        setAppLanguage(result.user?.language);
        setMustChangePassword(result.mustChangePassword);
        return result;
      })
      .finally(() => {
        loginPromiseRef.current = null;
      });

    return loginPromiseRef.current;
  }, []);

  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  const register = useCallback(
    async (firstName: string, lastName: string, email: string, password: string, passwordConfirmation: string, farm?: string, crops?: string[], farmProfile?: string, governorate?: string) => {
      if (registerPromiseRef.current) return registerPromiseRef.current;

      registerPromiseRef.current = authService.register(firstName, lastName, email, password, passwordConfirmation, farm, crops, farmProfile, governorate)
        .then((newUser) => {
          setUser(newUser);
          setAppLanguage(newUser?.language);
          setMustChangePassword(false);
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
        setMustChangePassword(false);
      })
      .finally(() => {
        logoutPromiseRef.current = null;
      });

    return logoutPromiseRef.current;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, mustChangePassword, login, register, logout, clearMustChangePassword, updateUser }}
    >
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
