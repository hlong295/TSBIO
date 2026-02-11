"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/contexts/auth-context";

export default function CapNhatMatKhauClient() {
  const router = useRouter();
  const { emailUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // This page is email-only.
    if (!emailUser) {
      router.replace("/dang-nhap");
    }
  }, [emailUser, router]);

  const canSubmit =
    !!currentPassword &&
    !!newPassword &&
    newPassword === confirmPassword &&
    newPassword.length >= 6;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />

      <div className="pt-[calc(3.5rem+1.25rem)] pb-24">
        <div className="container mx-auto px-4 py-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <div className="text-base font-semibold">Cập nhật mật khẩu</div>
              <div className="text-xs text-muted-foreground">
                Tài khoản email: <span className="font-medium">{emailUser?.email}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? <div className="text-sm text-red-600">{error}</div> : null}
              {!error && status ? (
                <div className="text-sm text-green-700">{status}</div>
              ) : null}

              <div className="space-y-2">
                <Label>Mật khẩu hiện tại</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                />
              </div>

              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>

              <div className="space-y-2">
                <Label>Nhập lại mật khẩu mới</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  disabled={loading || !canSubmit}
                  onClick={async () => {
                    setError(null);
                    setStatus(null);

                    if (newPassword !== confirmPassword) {
                      setError("Mật khẩu mới không khớp.");
                      return;
                    }
                    if (newPassword.length < 6) {
                      setError("Mật khẩu mới phải có tối thiểu 6 ký tự.");
                      return;
                    }

                    setLoading(true);
                    try {
                      const res = await fetch("/api/auth/change-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          current_password: currentPassword,
                          new_password: newPassword,
                        }),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        throw new Error(
                          `${json?.error || "CHANGE_PASSWORD_FAILED"}${json?.detail ? `: ${json.detail}` : ""}`
                        );
                      }
                      setStatus("Đã cập nhật mật khẩu thành công.");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    } catch (e: any) {
                      setError(e?.message || "CHANGE_PASSWORD_FAILED");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? "Đang lưu..." : "Lưu"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/tai-khoan">Quay lại</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
