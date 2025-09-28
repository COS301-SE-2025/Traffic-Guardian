import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "./themeContext"; // theme provider import (used below)

/** Shape of the session payload kept after login/registration */
export type SessionUser = {
  id?: string | number;
  User_Username?: string;
  User_Email?: string;
  User_Role?: string;
  /** Optional API key or token issued by backend */
  apiKey?: string;
  /** Anything else returned by API */
  [key: string]: any;
};

type SessionState = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  setSession: (user: SessionUser | null) => Promise<void>;
  clearSession: () => Promise<void>;
};

const STORAGE_KEY = "@trafficguardian/session";

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load persisted session on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch (e) {
        console.warn("Failed to restore session", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setSession = async (u: SessionUser | null) => {
    setUser(u);
    if (u) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearSession = async () => setSession(null);

  const value = useMemo<SessionState>(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      setSession,
      clearSession,
    }),
    [user, loading]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
};

/**
 * Helper hook to provide common auth headers for fetch calls.
 * Adds API key (if available) and the current theme as a hint header.
 */
export const useAuthHeaders = () => {
  const { user } = useSession();
  const { theme } = useTheme();
  return useMemo(
    () => ({
      ...(user?.apiKey ? { "X-API-KEY": user.apiKey } : {}),
      "X-Theme": theme,
    }),
    [user?.apiKey, theme]
  );
};



/*import React, { createContext, useState, useContext, ReactNode } from "react";

const SessionContext = createContext<any>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [user, setUser] = useState(null);

  return (
    <SessionContext.Provider value={{ user, setUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}*/
