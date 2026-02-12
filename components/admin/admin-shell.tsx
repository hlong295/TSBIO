"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminTokenContext } from "@/components/admin/admin-token-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { isRootIdentity } from "@/lib/root-admin";

type AdminRole = "root_admin" | "editor" | "provider" | "approval";

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, emailUser } = useAuth();

  const role = (emailUser?.role as AdminRole | null) || null;

  const isRootAdmin = useMemo(
    () =>
      isRootIdentity({
        email: emailUser?.email,
        username: emailUser?.username,
        role: emailUser?.role,
      }),
    [emailUser?.email, emailUser?.username, emailUser?.role]
  );

  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);

  // Refs to avoid effect re-run loops that can keep the UI stuck in "checking".
  const tokenRef = useRef<string | null>(null);
  const hydratedRef = useRef<boolean>(false);
  // When navigating login -> /admin in some WebViews, getSession() may temporarily hang.
  // We'll retry silently a few times before showing an error.
  const syncRetryRef = useRef<number>(0);
  const syncRetryTimerRef = useRef<any>(null);

  const setTokenSafe = (t: string | null) => {
    tokenRef.current = t;
    setToken(t);
  };

  const setHydratedSafe = (v: boolean) => {
    hydratedRef.current = v;
  };

  // IMPORTANT: Never block rendering the Admin UI solely on token hydration.
  // On Pi Browser / some mobile WebViews, `getSession()` can be slow or briefly return null during navigation.
  // Token is still required for API calls, but each call should fetch the latest token on-demand.
  // So: show a lightweight status line, and keep the UI interactive.

  useEffect(() => {
    // Hard guard: non-auth -> login.
    if (!hydratedRef.current) return;

    if (!isAuthenticated) {
      router.replace("/tai-khoan");
      return;
    }

    // IMPORTANT: Do not redirect away while the emailUser role is still being hydrated.
    // Root can be determined by stable identity (email/username) even before `/api/auth/me` completes.
    const isAdmin =
      isRootAdmin ||
      role === "root_admin" ||
      role === "editor" ||
      role === "provider" ||
      role === "approval";

    if (!isAdmin) {
      // Do not kick the user back to home; show a clear message in-place.
      setErr("FORBIDDEN_NOT_ADMIN");
    } else {
      setErr(null);
    }
  }, [isAuthenticated, role, isRootAdmin, router]);

  // Admin pages rely on a valid Supabase access_token to call server APIs.
  // On mobile/PWA, the in-memory session can desync unless we actively listen for changes.
  useEffect(() => {
    let mounted = true;
    let unsub: any = null;

    const CACHE_KEY = "tsbio_admin_access_token";

    // WebViews (Pi Browser / App Studio) sometimes need extra time right after a fresh
    // navigation from login -> /admin to hydrate cookies/storage. A too-short timeout will
    // incorrectly show a transient "Admin session error: timeout" until the user reloads.
    const withTimeout = <T,>(p: Promise<T>, ms: number) =>
      Promise.race([
        p,
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
      ]);

    const readCachedToken = () => {
      try {
        return sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
      } catch {
        return null;
      }
    };

    const writeCachedToken = (t: string | null) => {
      try {
        if (!t) {
          sessionStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_KEY);
        } else {
          sessionStorage.setItem(CACHE_KEY, t);
          localStorage.setItem(CACHE_KEY, t);
        }
      } catch {
        // ignore
      }
    };

    // Best-effort immediate token from storage to avoid blank admin while navigating.
    const cached = readCachedToken();
    if (cached) setTokenSafe(cached);

    async function syncToken(bestEffortRefresh: boolean) {
      if (!mounted) return;
      setCheckingSession(true);
      try {
        const { data } = await withTimeout(supabaseBrowser.auth.getSession(), 6000);
        const session = data?.session || null;
        let accessToken = session?.access_token || null;

        // If session temporarily unavailable, keep the currently known token.
        if (!accessToken) {
          accessToken = tokenRef.current || readCachedToken();
        }

        // If session exists but token is near-expiry (or missing), refresh it.
        const expiresAt = session?.expires_at ? session.expires_at * 1000 : null;
        const msLeft = expiresAt ? expiresAt - Date.now() : null;
        const shouldRefresh = !!session && (accessToken === null || (msLeft !== null && msLeft < 120_000));

        if (bestEffortRefresh && shouldRefresh) {
          const { data: refreshed, error } = await withTimeout(
            supabaseBrowser.auth.refreshSession(),
            8000
          );
          if (!error) {
            accessToken = refreshed?.session?.access_token || accessToken;
          }
        }

        setTokenSafe(accessToken);
        writeCachedToken(accessToken);
        setHydratedSafe(true);
        setErr(null);
      } catch (e: any) {
        // Never hard-logout here. Only surface the error after a few retries.
        const raw = e?.message || "NO_SESSION";
        const msg = String(raw).toLowerCase();

        // Never hard-clear token on transient failures (WebView/storage quirks).
        const fallback = tokenRef.current || readCachedToken();
        if (fallback) setTokenSafe(fallback);

        // Timeouts can happen immediately after login -> /admin navigation.
        // We retry silently a few times; only then we show an error.
        if (msg.includes("timeout") && syncRetryRef.current < 3) {
          syncRetryRef.current += 1;
          setHydratedSafe(true); // keep admin UI usable
          setErr(null);
          if (syncRetryTimerRef.current) clearTimeout(syncRetryTimerRef.current);
          syncRetryTimerRef.current = setTimeout(() => {
            // run again (without forcing a token refresh)
            syncToken(false);
          }, 800);
          return;
        }

        // If we still have no fallback token, surface the error.
        if (!fallback) {
          setErr(`Admin session error: ${raw}`);
          setHydratedSafe(true);
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }

    // Initial sync (try refresh once).
    syncToken(true);

    // Listen for auth changes to keep token in sync without reload.
    try {
      const { data } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        const accessToken = session?.access_token || null;
        setTokenSafe(accessToken);
        writeCachedToken(accessToken);
      });
      unsub = data?.subscription;
    } catch {
      // ignore
    }

    // Keepalive tick (admin-only): ensures token doesn't silently expire while user stays on /admin.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") syncToken(true);
    }, 60_000);

    // When the tab regains focus/visibility, re-sync (fixes WebView storage quirks).
    const onVis = () => {
      if (document.visibilityState === "visible") syncToken(true);
    };
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mounted = false;
      clearInterval(t);
      if (syncRetryTimerRef.current) {
        clearTimeout(syncRetryTimerRef.current);
        syncRetryTimerRef.current = null;
      }
      unsub?.unsubscribe?.();
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/admin">Dashboard</Link></Button>

            {/* Business */}
            <Button asChild variant="outline"><Link href="/admin/products">Products</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/categories">Categories</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/providers">Providers</Link></Button>
            {/* CMS */}
            <Button asChild variant="outline"><Link href="/admin/content/news">Tin tức CMS</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/content/rescue">Cứu vườn CMS</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/media">Media</Link></Button>

            {/* Root-only tools */}
            {isRootAdmin ? (
              <>
                <Button asChild variant="outline"><Link href="/admin/users">Users</Link></Button>
                <Button asChild variant="outline"><Link href="/admin/identities">Identities</Link></Button>
                <Button asChild variant="outline"><Link href="/admin/wallets">Wallets</Link></Button>
                <Button asChild variant="outline"><Link href="/admin/ledger">Ledger</Link></Button>
                <Button asChild variant="outline"><Link href="/admin/audit">Audit</Link></Button>
                <Button asChild variant="outline"><Link href="/admin/rules">Rules</Link></Button>
                <Button asChild variant="outline"><Link href="/admin/banner">Banner</Link></Button>
                <Button asChild variant="outline"><Link href="/admin/orphans">Orphans</Link></Button>
              </>
            ) : null}
          </div>
          <Separator className="my-4" />

          {err === "FORBIDDEN_NOT_ADMIN" ? (
            <div className="text-sm text-red-600">
              Bạn không có quyền truy cập Admin. (FORBIDDEN_NOT_ADMIN)
            </div>
          ) : (
            <>
              {/* Status line (does NOT block the UI). */}
              {err ? (
                <div className="text-sm text-red-600">Admin session error: {err}</div>
              ) : !token ? (
                <div className="text-sm text-muted-foreground">
                  {checkingSession ? "Đang kiểm tra phiên Admin..." : "Bạn cần đăng nhập email để dùng Admin."}
                </div>
              ) : null}

              {token ? (
                <AdminTokenContext.Provider value={token}>
                  {children}
                </AdminTokenContext.Provider>
              ) : (
                children
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function getAdminBearer() {
  const withTimeout = <T,>(p: Promise<T>, ms: number) =>
    Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ]);

  try {
    const { data } = await withTimeout(supabaseBrowser.auth.getSession(), 6000);
    const token = data?.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // ignore
  }

  // Fallback: cached token (best effort) for WebView quirks during client-side navigation.
  try {
    const cached =
      sessionStorage.getItem("tsbio_admin_access_token") ||
      localStorage.getItem("tsbio_admin_access_token");
    if (cached) return { Authorization: `Bearer ${cached}` };
  } catch {
    // ignore
  }

  return {};
}
