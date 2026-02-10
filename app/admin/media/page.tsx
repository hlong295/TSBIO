"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminShell, getAdminBearer } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type MediaItem = {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  metadata?: any;
};

type UploadState = {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  lastUrl?: string | null;
  lastPath?: string | null;
};

export default function AdminMediaPage() {
  const [prefix, setPrefix] = useState("uploads/");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: "idle", progress: 0 });

  const fileRef = useRef<HTMLInputElement | null>(null);

  const cleanPrefix = useMemo(() => {
    const p = (prefix || "uploads/").trim();
    // Ensure trailing slash so list() behaves like a folder prefix.
    if (p.endsWith("/")) return p;
    return p + "/";
  }, [prefix]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const headers = await getAdminBearer();
      const res = await fetch(`/api/admin/media/list?prefix=${encodeURIComponent(cleanPrefix)}`, {
        headers,
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `LIST_FAILED_${res.status}`);
      setItems(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doUpload() {
    if (!file) return;

    setUpload({ status: "uploading", progress: 0 });
    setErr(null);

    try {
      const headers = await getAdminBearer();
      const fd = new FormData();
      fd.set("file", file);

      // Map folder/prefix from the UI input:
      // e.g. cleanPrefix = "uploads/20260210/" => folder="uploads", prefix="20260210"
      const parts = cleanPrefix.replace(/^\/+|\/+$/g, "").split("/");
      const folder = parts[0] || "uploads";
      const pfx = parts.slice(1).join("/") || "";
      fd.set("folder", folder);
      if (pfx) fd.set("prefix", pfx);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/media/upload", true);
        const auth = (headers as any)?.Authorization;
        if (auth) xhr.setRequestHeader("Authorization", auth);

        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
          setUpload((s) => ({ ...s, status: "uploading", progress: pct }));
        };

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}") as any;
            if (xhr.status >= 200 && xhr.status < 300) {
              setUpload({
                status: "done",
                progress: 100,
                lastUrl: json?.url || null,
                lastPath: json?.path || null,
              });
              resolve();
            } else {
              const msg = json?.error || `UPLOAD_FAILED_${xhr.status}`;
              setUpload((s) => ({ ...s, status: "error", error: msg }));
              reject(new Error(msg));
            }
          } catch (e) {
            const msg = `UPLOAD_BAD_RESPONSE_${xhr.status}`;
            setUpload((s) => ({ ...s, status: "error", error: msg }));
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => {
          const msg = "UPLOAD_NETWORK_ERROR";
          setUpload((s) => ({ ...s, status: "error", error: msg }));
          reject(new Error(msg));
        };

        xhr.send(fd);
      });

      // Clear selected file
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";

      // Refresh list
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <AdminShell title="Media">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="w-[240px]"
            placeholder="uploads/"
          />
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {loading ? "Đang tải..." : "Refresh"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={fileRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-[320px]"
          />
          <Button onClick={doUpload} disabled={!file || upload.status === "uploading"}>
            {upload.status === "uploading" ? `Uploading ${upload.progress}%` : "Upload"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Bucket: <b>media</b> (list/upload qua admin API) — Prefix: <b>{cleanPrefix}</b>
        </div>

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        {upload.status === "done" && upload.lastUrl ? (
          <div className="text-sm">
            ✅ Uploaded: <span className="break-all">{upload.lastPath}</span>
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={upload.lastUrl}
                alt="uploaded"
                className="max-w-[240px] rounded border"
              />
            </div>
          </div>
        ) : null}

        {upload.status === "error" ? (
          <div className="text-sm text-red-600">Upload error: {upload.error || "UPLOAD_ERROR"}</div>
        ) : null}

        <Separator />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Updated</th>
                <th className="py-2 pr-3">Size</th>
              </tr>
            </thead>
            <tbody>
              {items?.length ? (
                items.map((it) => (
                  <tr key={it.id || it.name} className="border-t">
                    <td className="py-2 pr-3 break-all">{it.name}</td>
                    <td className="py-2 pr-3">{it.updated_at || it.created_at || ""}</td>
                    <td className="py-2 pr-3">{it.metadata?.size || ""}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={3}>
                    {loading ? "Đang tải..." : "(Empty)"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
