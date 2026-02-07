"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, emailUser } = useAuth();

  const isRootAdmin = useMemo(() => emailUser?.role === "root_admin", [emailUser?.role]);

  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Hard guard: non-auth -> login, non-root -> block
    if (!isAuthenticated) {
      router.replace("/tai-khoan");
      return;
    }
    if (!isRootAdmin) {
      setErr("FORBIDDEN_NOT_ROOT");
      router.replace("/");
    }
  }, [isAuthenticated, isRootAdmin, router]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        setToken(data?.session?.access_token || null);
      } catch (e: any) {
        setErr(e?.message || "NO_SESSION");
      }
    })();
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
            <Button asChild variant="outline"><Link href="/admin/users">Users</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/identities">Identities</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/wallets">Wallets</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/ledger">Ledger</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/audit">Audit</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/rules">Rules</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/orphans">Orphans</Link></Button>
          </div>
          <Separator className="my-4" />

          {err === "FORBIDDEN_NOT_ROOT" ? (
            <div className="text-sm text-red-600">
              Bạn không có quyền truy cập Admin. (FORBIDDEN_NOT_ROOT)
            </div>
          ) : err ? (
            <div className="text-sm text-red-600">Admin session error: {err}</div>
          ) : !token ? (
            <div className="text-sm text-muted-foreground">Bạn cần đăng nhập email để dùng Admin.</div>
          ) : !isRootAdmin ? (
            <div className="text-sm text-red-600">
              Bạn không có quyền truy cập Admin. (FORBIDDEN_NOT_ROOT)
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function getAdminBearer() {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
