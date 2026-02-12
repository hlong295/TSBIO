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
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [prefix, setPrefix] = useState("uploads/");
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const canUpload = useMemo(() => !!selected && !busy, [selected, busy]);

  const dbgEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("dbg") === "1";
  }, []);

  // Default folder = uploads/YYYYMMDD/ so both image & video land in a dated folder by default
  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const ymd = `${y}${m}${day}`;
    setPrefix((p) => (p === "uploads/" ? `uploads/${ymd}/` : p));
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

  function normalizePrefixValue(raw: string) {
    let p = (typeof raw==="string"?raw.trim():String(raw??""));
    if (!p) p = "uploads/";
    p = p.replace(/^\/+/, "").replace(/%2F/gi, "/").replace(/\/+/, "/");
    if (!p.endsWith("/")) p += "/";
    return p;
  }

  const load = async (overridePrefix?: string) => {
		// reset inline confirmation state on refresh/navigation
		setConfirmDeletePath(null);
    setError(null);
    try {
      const headers = { ...(await getAdminBearer()) } as any;
      const url = new URL("/api/admin/media/list", window.location.origin);
      const p = normalizePrefixValue((overridePrefix ?? prefix) || "uploads/");
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

      // IMPORTANT: do NOT stream large files through our server (Vercel body limits).
      // Use signed upload URL to upload directly to Supabase Storage.
      const signRes = await fetch("/api/admin/media/sign-upload", {
        method: "POST",
        headers: {
          ...bearer,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: kind || undefined,
          filename: selected.name,
          contentType: selected.type || "application/octet-stream",
          size: selected.size,
          folder: folder || "uploads",
        }),
      });

      const signJson: any = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        throw new Error(signJson?.error || "SIGN_FAILED");
      }
      const signedUrl: string | undefined = signJson?.signedUrl;
      if (!signedUrl) throw new Error("NO_SIGNED_URL");

      if (dbgEnabled) {
        setDbg(`PUT signedUrl (type=${selected.type || ""}, size=${selected.size}) -> ${signJson?.path || ""}`);
      }

      // Use XHR to show upload progress (fetch doesn't expose progress events).
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        // Supabase signed upload expects the raw bytes body.
        xhr.setRequestHeader("Content-Type", selected.type || "application/octet-stream");
        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setProgress(pct);
          setProgressText(`${Math.round(ev.loaded / 1024)}KB / ${Math.round(ev.total / 1024)}KB`);
        };
        xhr.onerror = () => reject(new Error("UPLOAD_FAILED"));
        xhr.onload = () => {
          const ok = xhr.status >= 200 && xhr.status < 300;
          if (!ok) {
            reject(new Error(`UPLOAD_FAILED: ${xhr.status}`));
            return;
          }
          setProgress(100);
          resolve();
        };
        xhr.send(selected);
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

  const normalizedPrefix = useMemo(() => {
    let p = (typeof prefix==="string"?prefix.trim():String(prefix??""));
    if (!p) p = "uploads/";
    p = p.replace(/^\/+/, "").replace(/%2F/gi, "/").replace(/\/+/, "/");
    if (!p.endsWith("/")) p += "/";
    return p;
  }, [prefix]);

  const prefixSegments = useMemo(() => normalizedPrefix.split("/").filter(Boolean), [normalizedPrefix]);

  const parentPrefix = useMemo(() => {
    if (prefixSegments.length <= 1) return null;
    return prefixSegments.slice(0, -1).join("/") + "/";
  }, [prefixSegments]);

  return (
    <AdminShell title="Media">
      <div className="flex flex-col gap-4">
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {dbgEnabled && dbg ? (
          <div className="text-xs text-muted-foreground break-all">DBG: {dbg}</div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={busy || !parentPrefix}
            onClick={() => {
              if (!parentPrefix) return;
              setPrefix(parentPrefix);
              load(parentPrefix);
            }}
          >
            Back
          </Button>
          <Input
            value={normalizedPrefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="prefix"
            className="max-w-[320px]"
          />
          <Button variant="outline" disabled={busy} onClick={load}>Refresh</Button>
        </div>


        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
          {prefixSegments.map((seg, idx) => {
            const href = prefixSegments.slice(0, idx + 1).join("/") + "/";
            const isLast = idx === prefixSegments.length - 1;
            return (
              <span key={href} className="flex items-center gap-1">
                <button
                  type="button"
                  className={isLast ? "font-medium text-foreground" : "underline"}
                  onClick={() => setPrefix(href)}
                >
                  {seg}
                </button>
                {!isLast ? <span>/</span> : null}
              </span>
            );
          })}
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
            const isVideo = !!it.metadata?.mimetype?.startsWith?.("video/") || /\.(mp4|webm|mov|m4v|avi)$/i.test(it.name);
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
                  ) : isVideo && publicUrl ? (
                    <video
                      src={publicUrl}
                      className="w-10 h-10 rounded object-cover border bg-black"
                      muted
                      playsInline
                      preload="metadata"
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
                        // list() already returns folder names ending with '/', avoid double slashes
                        const next = normalizePrefixValue(`${normalizedPrefix}${it.name}`);
                        setPrefix(next);
                        await new Promise((r) => setTimeout(r, 0));
                        load(next);
                      }}
                    >
                      {it.name}
                    </button>
                  ) : (
                    <span>{it.name}</span>
                  )}
                </div>
                <div className="col-span-3">{it.updated_at || ""}</div>
                <div className="col-span-1 text-right">{size}</div>
                <div className="col-span-1 text-right">
                  {!isFolder && publicUrl ? (
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <a className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                      <button
                        disabled={busy || loading}
                        className="underline disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <button
                        disabled={busy || loading}
                        className="underline disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={async () => {
                          const currentPath = `${normalizedPrefix}${it.name}`;
                          const input = window.prompt("Đổi tên (nhập tên mới hoặc đường dẫn mới)", it.name);
                          if (!input) return;
                          const nextPath = input.includes('/') ? input : `${normalizedPrefix}${input}`;
                          setError(null);
                          setLoading(true);
                          try {
                            const authHeaders = await getAdminBearer();
                            const auth = authHeaders?.Authorization;
                            if (!auth) throw new Error("NO_SESSION");
                            const res = await fetch("/api/admin/media/object", {
                              method: "PATCH",
                              headers: {
                                Authorization: auth,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ from: currentPath, to: nextPath }),
                            });
                            const json = await res.json().catch(() => ({}));
                            if (!res.ok || !json.ok) throw new Error(json.error || "RENAME_FAILED");
                            await load(prefix);
                          } catch (e: any) {
                            setError(e?.message || "RENAME_FAILED");
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        Rename
                      </button>
                      {confirmDeletePath === `${normalizedPrefix}${it.name}` ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busy || loading || deletingPath === `${normalizedPrefix}${it.name}`}
                            className="underline text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={async () => {
                              const currentPath = `${normalizedPrefix}${it.name}`;
                              setError(null);
                              setDeletingPath(currentPath);

                              // Optimistic UI: remove row immediately to keep INP low
                              const prev = items;
                              setItems((cur) => (Array.isArray(cur) ? cur.filter((x: any) => `${(x?.prefix || normalizedPrefix) ?? ""}${x?.name || ""}` !== currentPath) : cur));

                              try {
                                const authHeaders = await getAdminBearer();
                                const auth = authHeaders?.Authorization;
                                if (!auth) throw new Error("NO_SESSION");
                                const url = new URL("/api/admin/media/object", window.location.origin);
                                url.searchParams.set("path", currentPath);
                                const res = await fetch(url.toString(), {
                                  method: "DELETE",
                                  headers: { Authorization: auth },
                                });
                                const json = await res.json().catch(() => ({}));
                                if (!res.ok || !json.ok) throw new Error(json.error || "DELETE_FAILED");

                                // Refresh in background (do not await) to keep UI responsive
                                setTimeout(() => {
                                  load(prefix);
                                }, 250);
                              } catch (e: any) {
                                // rollback optimistic remove
                                setItems(prev);
                                setError(e?.message || "DELETE_FAILED");
                              } finally {
                                setDeletingPath(null);
                                setConfirmDeletePath(null);
                              }
                            }}
                          >
                            Xác nhận
                          </button>
                          <button
                            disabled={busy || loading || deletingPath === `${normalizedPrefix}${it.name}`}
                            className="underline text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setConfirmDeletePath(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={busy || loading}
                          className="underline text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => setConfirmDeletePath(`${normalizedPrefix}${it.name}`)}
                        >
                          Delete
                        </button>
                      )}
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
