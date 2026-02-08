"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BannerSettings = {
  heroImageUrl: string;
  headlineTop: string;
  headlineMid: string;
  headlineBottom: string;
  ctaSupportLabel: string;
  searchPlaceholder: string;
  diagnoseButtonLabel: string;
};

const DEFAULTS: BannerSettings = {
  heroImageUrl: "/tsbio-harvest-hero.jpg",
  headlineTop: "TSBIO - ĐỒNG HÀNH CỨU VƯỜN",
  headlineMid: "HƠN 10.000 NHÀ VƯỜN",
  headlineBottom: "PHỤC HỒI VƯỜN THÀNH CÔNG",
  ctaSupportLabel: "HỖ TRỢ KỸ THUẬT CHUYÊN SÂU",
  searchPlaceholder: "Vườn bạn đang gặp vấn đề gì?",
  diagnoseButtonLabel: "CHẨN ĐOÁN NGAY",
};

function getBearer() {
  try {
    return localStorage.getItem("tsbio_admin_bearer") || "";
  } catch {
    return "";
  }
}

export default function AdminBannerPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [ok, setOk] = useState<string>("");
  const [data, setData] = useState<BannerSettings>(DEFAULTS);

  const bearer = useMemo(() => getBearer(), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch("/api/admin/banner", {
          headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
          cache: "no-store",
        });
        const j = await res.json();
        if (!mounted) return;
        if (!res.ok || !j?.ok) throw new Error(j?.error || "LOAD_FAILED");
        setData({ ...DEFAULTS, ...(j.settings || {}) });
      } catch (e: any) {
        if (!mounted) return;
        setErr(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [bearer]);

  async function onSave() {
    try {
      setSaving(true);
      setOk("");
      setErr("");
      const res = await fetch("/api/admin/banner", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify({ settings: data }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "SAVE_FAILED");
      setOk("Đã lưu cấu hình banner.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(file?: File | null) {
    if (!file) return;
    try {
      setUploading(true);
      setOk("");
      setErr("");

      const filename = file.name || "banner.jpg";
      const sign = await fetch("/api/admin/media/sign-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify({
          filename,
          contentType: file.type || "image/jpeg",
          prefix: "banners",
        }),
      });
      const sj = await sign.json();
      if (!sign.ok || !sj?.ok) throw new Error(sj?.error || "SIGN_UPLOAD_FAILED");

      // Upload directly to the signed URL
      const up = await fetch(sj.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "image/jpeg",
        },
        body: file,
      });
      if (!up.ok) throw new Error("UPLOAD_FAILED");

      setData((prev) => ({ ...prev, heroImageUrl: sj.publicUrl }));
      setOk("Đã tải ảnh banner. Nhấn Lưu để áp dụng.");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminShell>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quản trị Banner (Home Hero)</h2>

        {loading ? (
          <div className="text-sm text-muted-foreground">Đang tải...</div>
        ) : null}

        {err ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        ) : null}
        {ok ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</div>
        ) : null}

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ảnh Banner</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={data.heroImageUrl}
                  onChange={(e) => setData((p) => ({ ...p, heroImageUrl: e.target.value }))}
                  placeholder="URL ảnh banner"
                />
                <label className={cn("inline-flex", uploading && "opacity-60")}> 
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                  <Button type="button" variant="outline" disabled={uploading}>
                    {uploading ? "Đang up..." : "Upload"}
                  </Button>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setData((p) => ({ ...p, heroImageUrl: "" }))}
                >
                  Xóa ảnh
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Gợi ý: upload vào thư mục <b>banners/</b> trong Media.</div>
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.heroImageUrl || DEFAULTS.heroImageUrl}
                  alt="banner preview"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Dòng 1</Label>
              <Input value={data.headlineTop} onChange={(e) => setData((p) => ({ ...p, headlineTop: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Dòng 2</Label>
              <Input value={data.headlineMid} onChange={(e) => setData((p) => ({ ...p, headlineMid: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Dòng 3</Label>
              <Input value={data.headlineBottom} onChange={(e) => setData((p) => ({ ...p, headlineBottom: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nút CTA (màu cam)</Label>
              <Input
                value={data.ctaSupportLabel}
                onChange={(e) => setData((p) => ({ ...p, ctaSupportLabel: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ô nhập (placeholder)</Label>
              <Textarea
                value={data.searchPlaceholder}
                onChange={(e) => setData((p) => ({ ...p, searchPlaceholder: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Nút chẩn đoán</Label>
              <Input
                value={data.diagnoseButtonLabel}
                onChange={(e) => setData((p) => ({ ...p, diagnoseButtonLabel: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setData(DEFAULTS)}
              disabled={saving || uploading}
            >
              Reset mặc định
            </Button>
            <Button type="button" onClick={onSave} disabled={saving || uploading}>
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
