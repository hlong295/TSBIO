"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
  displayName?: string;
  role?: "admin" | "user";
  createdAt?: string;
}

export interface EmailUser {
  id: string;
  email: string;
  username?: string;
  role?: string;
  level?: number | null;
  emailVerified?: boolean;
  createdAt?: string | null;
  wallet?: {
    balance: number;
    locked: number;
  } | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  piUser: PiUser | null;
  emailUser: EmailUser | null;
  // Pi login (existing)
  login: (user: PiUser) => void;
  // Email auth helpers
  refreshEmailUser: () => Promise<void>;
  logout: () => Promise<void> | void;
  updateDisplayName: (displayName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [emailUser, setEmailUser] = useState<EmailUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Always derive auth flag from actual users (avoid stale state).
  useEffect(() => {
    setIsAuthenticated(!!piUser || !!emailUser);
  }, [piUser, emailUser]);

  // Load Pi user from localStorage (existing behavior)
  useEffect(() => {
    const storedUser = localStorage.getItem("tsbio_pi_user");
    if (!storedUser) return;
    try {
      const user = JSON.parse(storedUser);
      setPiUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("[TSBIO] Failed to parse stored Pi user:", error);
      localStorage.removeItem("tsbio_pi_user");
    }
  }, []);

  // Load Supabase email session (if any)
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        if (data?.session?.user) {
          setIsAuthenticated(true);
          await refreshEmailUserInternal();
        }
      } catch (e) {
        // env not set or supabase not ready
        console.warn("[TSBIO] Supabase session init failed:", (e as any)?.message || e);
      }
    }

    init();

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setIsAuthenticated(true);
        await refreshEmailUserInternal();
      } else {
        setEmailUser(null);
        setIsAuthenticated(!!piUser);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (user: PiUser) => {
    setPiUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("tsbio_pi_user", JSON.stringify(user));
  };

  const updateDisplayName = (displayName: string) => {
    if (!piUser) return;
    const updatedUser = { ...piUser, displayName };
    setPiUser(updatedUser);
    localStorage.setItem("tsbio_pi_user", JSON.stringify(updatedUser));
  };

  async function refreshEmailUserInternal() {
    const { data: sess } = await supabaseBrowser.auth.getSession();
    const token = sess?.session?.access_token;
    const user = sess?.session?.user;
    if (!token || !user?.id || !user?.email) return;

    // Ensure DB-side profile/identity/wallet exist
    await fetch("/api/auth/ensure-profile", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    }).catch(() => null);

    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null as any);

    if (!res?.ok) {
      // Fallback (still usable for basic UI)
      setEmailUser({
        id: user.id,
        email: user.email,
        emailVerified: !!(user as any).email_confirmed_at,
        createdAt: (user as any).created_at || null,
        wallet: null,
      });
      return;
    }

    const data = await res.json();
    const profile = data?.profile;
    const wallet = data?.wallet;

    setEmailUser({
      id: user.id,
      email: user.email,
      emailVerified: !!data?.auth?.email_confirmed_at,
      createdAt: profile?.created_at || (user as any).created_at || null,
      username: profile?.username || undefined,
      role: profile?.role || undefined,
      level: profile?.level ?? null,
      wallet: wallet
        ? {
            balance: Number(wallet.balance ?? 0),
            locked: Number(wallet.locked ?? 0),
          }
        : null,
    });
  }

  const refreshEmailUser = async () => {
    await refreshEmailUserInternal();
  };

  const logout = async () => {
    setPiUser(null);
    localStorage.removeItem("tsbio_pi_user");
    setEmailUser(null);
    try {
      await supabaseBrowser.auth.signOut();
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      piUser,
      emailUser,
      login,
      refreshEmailUser,
      logout,
      updateDisplayName,
    }),
    [isAuthenticated, piUser, emailUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
