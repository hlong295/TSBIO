"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, getAdminBearer } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MediaItem = {
  name: string;
  id?: string | null;
  updated_at?: string | null;
  metadata?: { size?: number; mimetype?: string } | any;
};

function getPublicSupabaseUrl(): string {
  // Prefer NEXT_PUBLIC_* at build time; fall back to runtime injected env (some Pi setups)
  // @ts-ignore
  const winEnv = typeof window !== "undefined" ? (window.__TSBIO_PUBLIC_ENV__ || window.__PUBLIC_ENV__) : null;
  return (
    (process.env.NEXT_PUBLIC_SUPABASE_URL as string) ||
    (winEnv?.NEXT_PUBLIC_SUPABASE_URL as string) ||
    (winEnv?.SUPABASE_URL as string) ||
    ""
  );
}

function buildPublicUrl(bucket: string, objectPath: string): string {
  const base = getPublicSupabaseUrl();
  if (!base) return "";
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = objectPath.replace(/^\/+/, "");
  return `${cleanBase}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

function isLikelyFolder(it: MediaItem): boolean {
  // Supabase storage list returns folders as objects without id/metadata.size
  return !it.id && !(it.metadata && typeof it.metadata.size === "number");
}

function guessKindByMime(mime: string | undefined): "image" | "video" | "other" {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

function isImagePath(path: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(path);
}

function isVideoPath(path: string) {
  return /\.(mp4|mov|webm|m4v)$/i.test(path);
}

function guessKindFromName(name: string): "image" | "video" | "file" {
  if (isImagePath(name)) return "image";
  if (isVideoPath(name)) return "video";
  return "file";
}

export default function AdminMediaPage() {
  const [error, setError] = useState<string | null>(null);
  const [dbg, setDbg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [prefix, setPrefix] = useState("uploads/");
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const canUpload = useMemo(() => !!selected && !busy, [selected, busy]);

  const dbgEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("dbg") === "1";
  }, []);

  function inferKind(file: File): "image" | "video" | null {
    const t = (file.type || "").toLowerCase();
    if (t.startsWith("image/")) return "image";
    if (t.startsWith("video/")) return "video";
    const n = (file.name || "").toLowerCase();
    if (n.match(/\.(png|jpg|jpeg|webp|gif)$/)) return "image";
    if (n.match(/\.(mp4|mov|webm)$/)) return "video";
    return null;
  }

  const load = async (overridePrefix?: string) => {
    setError(null);
    try {
      const headers = { ...(await getAdminBearer()) } as any;
      const url = new URL("/api/admin/media/list", window.location.origin);
      const p = (overridePrefix ?? prefix) || "uploads/";
      url.searchParams.set("prefix", p);
      const res = await fetch(url.toString(), { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${json?.error || "LIST_FAILED"}${json?.detail ? `: ${json.detail}` : ""}`);
      setItems(json?.items || []);
    } catch (e: any) {
      setError(e?.message || "LIST_FAILED");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    setProgressText("");
    if (dbgEnabled) setDbg(null);
    try {
      // Admin media page uses the dedicated upload route (validated + foldered),
      // and only uses prefix for listing.
      const bearer = (await getAdminBearer()) as any;
      if (!bearer?.Authorization) throw new Error("NO_SESSION");

      const folder = (prefix || "uploads/")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "")
        .replace(/%2F/gi, "/");
      const kind = inferKind(selected);

      const url = new URL("/api/admin/media/upload", window.location.origin);
      url.searchParams.set("folder", folder || "uploads");
      if (kind) url.searchParams.set("kind", kind);

      const fd = new FormData();
      fd.append("file", selected);
      fd.append("filename", selected.name);
      fd.append("contentType", selected.type || "application/octet-stream");

      if (dbgEnabled) {
        setDbg(`POST ${url.toString()} (type=${selected.type || ""}, size=${selected.size})`);
      }

      // Use XHR to show upload progress (fetch doesn't expose progress events).
      const json: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url.toString(), true);
        Object.entries(bearer).forEach(([k, v]) => {
          if (typeof v === "string") xhr.setRequestHeader(k, v);
        });
        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setProgress(pct);
          setProgressText(`${Math.round(ev.loaded / 1024)}KB / ${Math.round(ev.total / 1024)}KB`);
        };
        xhr.onerror = () => reject(new Error("UPLOAD_FAILED"));
        xhr.onload = () => {
          const ok = xhr.status >= 200 && xhr.status < 300;
          let body: any = {};
          try {
            body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          } catch {
            body = { raw: xhr.responseText };
          }
          if (!ok) {
            reject(new Error(`${body?.error || "UPLOAD_FAILED"}${body?.detail ? `: ${body.detail}` : ""}`));
            return;
          }
          setProgress(100);
          resolve(body);
        };
        xhr.send(fd);
      });

      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "UPLOAD_FAILED");
    } finally {
      setProgressText("");
      setBusy(false);
    }
  };

  return (
    <AdminShell title="Media">
      <div className="flex flex-col gap-4">
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {dbgEnabled && dbg ? (
          <div className="text-xs text-muted-foreground break-all">DBG: {dbg}</div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="prefix" className="max-w-[280px]" />
          <Button variant="outline" disabled={busy} onClick={load}>Refresh</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            onChange={(e) => setSelected(e.target.files?.[0] || null)}
          />
          <Button disabled={!canUpload} onClick={upload}>Upload</Button>
          {busy && selected ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <div className="w-40 h-2 rounded bg-muted overflow-hidden">
                <div className="h-2 bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
              </div>
              <span>{progress ? `${progress}%` : ""}</span>
              {progressText ? <span>({progressText})</span> : null}
            </div>
          ) : null}
        </div>

        <div className="text-sm text-muted-foreground">
          Bucket: <b>media</b> (list/upload via admin API)
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-2 text-xs bg-muted">
            <div className="col-span-1">Preview</div>
            <div className="col-span-6">Name</div>
            <div className="col-span-3">Updated</div>
            <div className="col-span-1 text-right">Size</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {(items || []).map((it: MediaItem, idx: number) => {
            const isFolder = !it.id && !it.metadata?.mimetype && !it.metadata?.size && !it.name.includes(".");
            const cleanPrefix = (prefix || "uploads/")
              .replace(/^\/+/, "")
              .replace(/%2F/gi, "/")
              .replace(/\/+/g, "/");
            const normalizedPrefix = cleanPrefix.endsWith("/") ? cleanPrefix : `${cleanPrefix}/`;
            const objectPath = isFolder ? "" : `${normalizedPrefix}${it.name}`;
            const publicUrl = objectPath ? buildPublicUrl("media", objectPath) : "";
            const isImage = !!it.metadata?.mimetype?.startsWith?.("image/") || /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(it.name);
            const size = it.metadata?.size ?? "";

            return (
              <div key={idx} className="grid grid-cols-12 gap-2 p-2 text-xs border-t items-center">
                <div className="col-span-1">
                  {isFolder ? (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">📁</div>
                  ) : isImage && publicUrl ? (
                    // Use <img> to avoid next/image domain config issues.
                    <img
                      src={publicUrl}
                      alt={it.name}
                      className="w-10 h-10 rounded object-cover border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">📄</div>
                  )}
                </div>
                <div className="col-span-6 break-all">
                  {isFolder ? (
                    <button
                      className="underline text-left"
                      onClick={async () => {
                        const next = `${normalizedPrefix}${it.name}/`;
                        setPrefix(next);
                        await new Promise((r) => setTimeout(r, 0));
                        load(next);
                      }}
                    >
                      {it.name}/
                    </button>
                  ) : (
                    <span>{it.name}</span>
                  )}
                </div>
                <div className="col-span-3">{it.updated_at || ""}</div>
                <div className="col-span-1 text-right">{size}</div>
                <div className="col-span-1 text-right">
                  {!isFolder && publicUrl ? (
                    <div className="flex justify-end gap-2">
                      <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                      <button
                        className="underline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(publicUrl);
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!items?.length ? <div className="p-2 text-sm text-muted-foreground">No items.</div> : null}
        </div>
      </div>
    </AdminShell>
  );
}
