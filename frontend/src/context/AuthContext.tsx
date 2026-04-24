import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { User } from "../services/authService";
import * as authService from "../services/authService";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const providerId = useRef(Math.random().toString(36).slice(2));
  console.log("AUTH_PROVIDER_RENDER", providerId.current);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkingRef = useRef(false);
  const loginPromiseRef = useRef<Promise<User> | null>(null);
  const registerPromiseRef = useRef<Promise<User> | null>(null);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  // Au montage, tenter de restaurer la session existante
  useEffect(() => {
    let cancelled = false;
    if (checkingRef.current) return;
    checkingRef.current = true;

    authService
      .getCurrentUser()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { 
        if (!cancelled) setLoading(false); 
        checkingRef.current = false;
      });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log("AUTH_CONTEXT_LOGIN_CALLED_PROVIDER", providerId.current);

    if (loginPromiseRef.current) {
      return loginPromiseRef.current;
    }

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
    async (name: string, email: string, password: string, passwordConfirmation: string) => {
      if (registerPromiseRef.current) {
        return registerPromiseRef.current;
      }

      registerPromiseRef.current = authService.register(name, email, password, passwordConfirmation)
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
    if (logoutPromiseRef.current) {
      return logoutPromiseRef.current;
    }

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
