"use client";

import * as React from "react";

import { fetchWithAuth } from "@/lib/api/fetch-with-auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type UploadStatus = "idle" | "uploading" | "done" | "error";

export type MediaDraftItem = {
  id: string;
  kind: "image" | "video";
  name: string;
  status: UploadStatus;
  progress: number; // 0..100
  // For realtime device uploads
  tmp_path?: string;
  url?: string;
  // Optional thumbnail for videos (generated client-side)
  thumbnail_url?: string;
  thumbnail_tmp_path?: string;
  // For library picks (already uploaded)
  library_url?: string;
  error?: string;
};

async function generateVideoThumbnail(file: File): Promise<File | null> {
  try {
    const blobUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onErr = () => reject(new Error("VIDEO_LOAD_FAILED"));
      video.addEventListener("loadeddata", onLoaded, { once: true });
      video.addEventListener("error", onErr, { once: true });
    });

    // Seek to a small offset to avoid black first frame on some videos.
    const seekTo = Math.min(0.2, Math.max(0, (video.duration || 0) * 0.05));
    if (!Number.isNaN(seekTo) && seekTo > 0) {
      try {
        video.currentTime = seekTo;
        await new Promise<void>((resolve) => {
          video.addEventListener("seeked", () => resolve(), { once: true });
        });
      } catch {
        // ignore seek issues
      }
    }

    const canvas = document.createElement("canvas");
    const w = Math.max(1, video.videoWidth || 1);
    const h = Math.max(1, video.videoHeight || 1);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("NO_CANVAS");
    ctx.drawImage(video, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
    URL.revokeObjectURL(blobUrl);
    if (!blob) return null;
    return new File([blob], `thumb_${Date.now()}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export type MediaDraftState = {
  images: MediaDraftItem[];
  video: MediaDraftItem | null;
  // Simple library picks (URLs). We keep this to avoid breaking existing UI.
  libraryImages: string[];
  libraryVideoUrl: string | null;
};

type Props = {
  value: MediaDraftState;
  onChange: React.Dispatch<React.SetStateAction<MediaDraftState>>;
  maxImages?: number;
  maxVideo?: number;
  disabled?: boolean;
  /** Bearer headers from AdminShell (required for /api/admin/* routes) */
  apiHeaders?: HeadersInit;
};

function uid() {
  // Short-ish id for client state.
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatPercent(p: number) {
  const n = Math.max(0, Math.min(100, Math.round(p)));
  return `${n}%`;
}

async function deleteTemp(path: string, apiHeaders?: HeadersInit) {
  try {
    const doFetch: typeof fetch = (apiHeaders as any)?.Authorization ? fetch : (fetchWithAuth as any);
    const res = await doFetch(`/api/admin/media/tmp-upload?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
      headers: apiHeaders,
    });
    // Best-effort.
    await res.json().catch(() => null);
  } catch {
    // ignore
  }
}

async function uploadTempWithProgress(opts: {
  kind: "image" | "video";
  file: File;
  onProgress: (p: number) => void;
  apiHeaders?: HeadersInit;
}): Promise<{ tmp_path: string; url: string }>
{
  const { kind, file, onProgress, apiHeaders } = opts;

  // IMPORTANT (Pi/Vercel compatibility):
  // Uploading videos via Route Handlers using formData can hit hosting request-size
  // limits and return non-JSON bodies (e.g. "Request ..."), causing JSON parse errors.
  // For videos we use server-issued signed upload URLs to stream directly to Storage.
  if (kind === "video") {
    return uploadTempSignedWithProgress({ kind, file, onProgress, apiHeaders });
  }

  // Route Handlers authenticate via `Authorization: Bearer <access_token>`.
  // If caller didn't pass it (common on first render), try to derive it from current session.
  const hdrs = new Headers(apiHeaders || {});
  if (!hdrs.get("Authorization")) {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data?.session?.access_token;
    if (token) hdrs.set("Authorization", `Bearer ${token}`);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/media/tmp-upload?kind=${encodeURIComponent(kind)}`, true);

    // Apply headers (including Authorization)
    hdrs.forEach((v, k) => {
      if (typeof v === "string") xhr.setRequestHeader(k, v);
    });

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const p = (evt.loaded / evt.total) * 100;
      onProgress(p);
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        // Support both response shapes:
        // - v65 tmp-upload: { ok:true, item:{ path, url } }
        // - legacy: { ok:true, path, url }
        const path = data?.item?.path || data?.path;
        const url = data?.item?.url || data?.url;
        if (xhr.status >= 200 && xhr.status < 300 && data?.ok && path && url) {
          resolve({ tmp_path: path, url });
          return;
        }
        reject(new Error(data?.error || `UPLOAD_FAILED_${xhr.status}`));
      } catch (e: any) {
        reject(new Error(e?.message || "UPLOAD_FAILED"));
      }
    };

    xhr.onerror = () => reject(new Error("UPLOAD_NETWORK_ERROR"));

    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

async function uploadTempSignedWithProgress(opts: {
  kind: "video";
  file: File;
  onProgress: (p: number) => void;
  apiHeaders?: HeadersInit;
}): Promise<{ tmp_path: string; url: string }> {
  const { kind, file, onProgress, apiHeaders } = opts;

  // Ensure Authorization header exists
  const hdrs = new Headers(apiHeaders || {});
  if (!hdrs.get("Authorization")) {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data?.session?.access_token;
    if (token) hdrs.set("Authorization", `Bearer ${token}`);
  }

  // 1) Ask server for a signed upload URL
  const doFetch: typeof fetch = (hdrs as any)?.get?.("Authorization") ? fetch : (fetchWithAuth as any);
  const res = await doFetch("/api/admin/media/tmp-sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(Object.fromEntries(hdrs.entries()) as any) },
    body: JSON.stringify({ kind, filename: file.name || "video" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok || !json?.item?.path || !json?.item?.token) {
    throw new Error(`${json?.error || "SIGNED_UPLOAD_FAILED"}${json?.detail ? `: ${json.detail}` : ""}`);
  }
  const path = String(json.item.path);
  const token = String(json.item.token);
  const publicUrl = String(json.item.url || "");

  // 2) Upload to Storage using Supabase helper (more compatible across browsers/webviews)
  // NOTE: uploadToSignedUrl does not expose progress events. We keep the existing UI
  // progress label responsive via a lightweight simulated progress that stops at 95%
  // until the upload completes.
  let simulated = 1;
  onProgress(simulated);
  const tick = typeof window !== "undefined"
    ? window.setInterval(() => {
        // Ease-out towards 95%
        simulated = Math.min(95, simulated + Math.max(0.8, (95 - simulated) * 0.12));
        onProgress(simulated);
      }, 450)
    : (null as any);

  try {
    const uploadPromise = supabaseBrowser.storage
      .from("media")
      // @ts-ignore - options shape depends on supabase-js version
      .uploadToSignedUrl(path, token, file, file.type ? { contentType: file.type } : undefined);

    // Hard timeout to avoid hanging forever on flaky webviews.
    const timeoutMs = 10 * 60 * 1000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("UPLOAD_TIMEOUT")), timeoutMs)
    );

    const out: any = await Promise.race([uploadPromise as any, timeoutPromise]);
    const err = out?.error;
    if (err) throw new Error(err?.message || "UPLOAD_FAILED");
  } finally {
    if (tick) window.clearInterval(tick);
  }

  onProgress(100);

  return { tmp_path: path, url: publicUrl };
}

// Minimal inline library picker placeholder to keep the existing UI button.
function getPublicSupabaseUrl(): string {
  // Prefer NEXT_PUBLIC_* at build time; fall back to runtime injected env.
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

function isImageName(name: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(name);
}

function isVideoName(name: string) {
  return /\.(mp4|mov|webm|m4v)$/i.test(name);
}

function AdminMediaPickerInline(props: {
  label: string;
  disabled?: boolean;
  maxImagesLeft: number;
  canPickVideo: boolean;
  onPickImageUrls: (urls: string[]) => void;
  onPickVideoUrl: (url: string) => void;
  apiHeaders?: HeadersInit;
}) {
  const { label, disabled, maxImagesLeft, canPickVideo, onPickImageUrls, onPickVideoUrl, apiHeaders } = props;

  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [prefix, setPrefix] = React.useState("uploads/");
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const doLoad = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    let watchdog: number | undefined;

    try {
      const headers = { ...(apiHeaders as any) } as any;
      const url = new URL("/api/admin/media/list", window.location.origin);
      url.searchParams.set("prefix", prefix || "uploads/");
      url.searchParams.set("limit", "100");
      // Use fetchWithAuth to guarantee Authorization header exists.
      // Some environments may drop/omit headers if we rely on plain fetch.
      const res = await fetchWithAuth(url.toString(), { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${json?.error || "LIST_FAILED"}${json?.detail ? `: ${json.detail}` : ""}`);
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e: any) {
      setError(e?.message || "LIST_FAILED");
    } finally {
      setLoading(false);
    }
  }, [apiHeaders, prefix]);

  React.useEffect(() => {
    if (!open) return;
    doLoad();
  }, [open, doLoad]);

  const filtered = React.useMemo(() => {
    const kw = (q || "").trim().toLowerCase();
    if (!kw) return items;
    return (items || []).filter((it) => String(it?.name || "").toLowerCase().includes(kw));
  }, [items, q]);

  const pickImages = (urls: string[]) => {
    if (!urls.length) return;
    onPickImageUrls(urls.slice(0, Math.max(0, maxImagesLeft)));
    setOpen(false);
  };

  const pickVideo = (url: string) => {
    if (!url) return;
    onPickVideoUrl(url);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          disabled={disabled}
          aria-label={label}
        >
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[860px]">
        <DialogHeader>
          <DialogTitle>Thư viện media</DialogTitle>
        </DialogHeader>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="prefix (vd: uploads/)" className="max-w-[240px]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên file" className="max-w-[240px]" />
          <Button type="button" variant="outline" onClick={doLoad} disabled={loading}>
            Refresh
          </Button>
          <div className="text-xs text-muted-foreground">
            Chọn tối đa: {Math.max(0, maxImagesLeft)} ảnh{canPickVideo ? " + 1 video" : ""}
          </div>
        </div>

        <div className="mt-3 max-h-[55vh] overflow-auto rounded-md border p-2">
          {loading ? <div className="text-sm text-muted-foreground">Đang tải…</div> : null}
          {!loading && (!filtered || filtered.length === 0) ? (
            <div className="text-sm text-muted-foreground">Không có file trong thư viện.</div>
          ) : null}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {(filtered || []).map((it: any, idx: number) => {
              const name = String(it?.name || "");
              if (!name) return null;
              // Skip folders
              if (!it?.id && !name.includes(".")) return null;
              const cleanPrefix = (prefix || "uploads/").replace(/^\/+/, "").replace(/%2F/gi, "/").replace(/\/+/, "/");
              const normalizedPrefix = cleanPrefix.endsWith("/") ? cleanPrefix : `${cleanPrefix}/`;
              const objectPath = `${normalizedPrefix}${name}`;
              const url = buildPublicUrl("media", objectPath);
              const canImg = isImageName(name) && maxImagesLeft > 0;
              const canVid = isVideoName(name) && canPickVideo;
              const disabledPick = !(canImg || canVid);

              return (
                <button
                  key={`${name}_${idx}`}
                  type="button"
                  className={
                    "rounded-md border p-2 text-left hover:bg-muted " +
                    (disabledPick ? "opacity-50 cursor-not-allowed" : "cursor-pointer")
                  }
                  disabled={disabledPick}
                  onClick={() => {
                    if (canImg) pickImages([url]);
                    else if (canVid) pickVideo(url);
                  }}
                  title={name}
                >
                  <div className="text-xs text-muted-foreground truncate">{name}</div>
                  {isImageName(name) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={name} className="mt-2 h-20 w-full rounded object-cover" />
                  ) : (
                    <div className="mt-2 h-20 w-full rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      {isVideoName(name) ? "VIDEO" : "FILE"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminProductMediaDraft({
  value,
  onChange,
  maxImages = 10,
  maxVideo = 1,
  disabled = false,
  apiHeaders,
}: Props) {
  // Defensive normalization: older/partial draft objects can miss array fields.
  // Never crash the page because `.length` is accessed on undefined.
  const safeValue: MediaDraftState = {
    images: Array.isArray(value?.images) ? value.images : [],
    video: value?.video ?? null,
    libraryImages: Array.isArray((value as any)?.libraryImages)
      ? (value as any).libraryImages
      : [],
    libraryVideoUrl: (value as any)?.libraryVideoUrl ?? null,
  };

  // If we had to normalize, push the repaired shape upstream once.
  React.useEffect(() => {
    if (value !== safeValue) {
      const needsRepair =
        !Array.isArray((value as any)?.images) ||
        !Array.isArray((value as any)?.libraryImages) ||
        typeof (value as any)?.libraryVideoUrl === "undefined" ||
        typeof (value as any)?.video === "undefined";
      if (needsRepair) onChange(safeValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { images, video, libraryImages, libraryVideoUrl } = safeValue;

  // IMPORTANT:
  // We previously relied on a <label> overlay click to open the file picker.
  // In practice, some environments (WebViews / strict browser settings)
  // can fail to trigger the picker or the change event reliably.
  // We keep a hidden input with an explicit ref and trigger it from an
  // onClick handler that is initiated by a real user gesture.
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

  const dbg = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return new URLSearchParams(window.location.search).get("dbg") === "1";
    } catch {
      return false;
    }
  }, []);

  // Keep upload component minimal: avoid extra debug state that can break runtime.

  const [dbgMsg, setDbgMsg] = React.useState<string>("");
  const dbgLog = (msg: string) => {
    if (!dbg) return;
    try {
      setDbgMsg(`${new Date().toISOString()} | ${msg}`);
      // Also log to console when available.
      // eslint-disable-next-line no-console
      console.log("[AdminMediaDraft]", msg);
    } catch {
      // ignore
    }
  };

  const pendingCount = React.useMemo(() => {
    const imgPending = images.filter((x) => x.status === "uploading").length;
    const vidPending = video?.status === "uploading" ? 1 : 0;
    return imgPending + vidPending;
  }, [images, video]);

  const totalImagesCount = images.length + libraryImages.length;
  const hasVideo = Boolean(video) || Boolean(libraryVideoUrl);

  async function handleChooseImages(files: FileList | File[] | null) {
    const fileArr: File[] = Array.isArray(files) ? files : files ? Array.from(files) : [];
    if (!fileArr || fileArr.length === 0) return;

    const allowed = Math.max(0, maxImages - totalImagesCount);
    const selected = fileArr.slice(0, allowed);
    if (selected.length === 0) return;

    // Add placeholders then upload.
    const newItems: MediaDraftItem[] = selected.map((f) => ({
      id: uid(),
      kind: "image",
      name: f.name,
      status: "uploading",
      progress: 0,
    }));

    onChange((prev) => ({
      ...prev,
      images: [...(prev.images || []), ...newItems],
    }) as any);

    // Upload each sequentially to keep it reliable on mobile/Pi Browser.
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const itemId = newItems[i].id;

      try {
        const result = await uploadTempWithProgress({
          kind: "image",
          file,
          // Use bearer headers from AdminShell. (Do NOT reference a missing `auth` var.)
          apiHeaders,
          onProgress: (p) => {
            onChange((prev) => {
              const next = { ...prev };
              next.images = prev.images.map((it) =>
                it.id === itemId ? { ...it, progress: p, status: "uploading" } : it
              );
              return next;
            });
          },
        });

        onChange((prev) => {
          const next = { ...prev };
          next.images = prev.images.map((it) =>
            it.id === itemId
              ? { ...it, status: "done", progress: 100, tmp_path: result.tmp_path, url: result.url }
              : it
          );
          return next;
        });
      } catch (e: any) {
        onChange((prev) => {
          const next = { ...prev };
          next.images = prev.images.map((it) =>
            it.id === itemId ? { ...it, status: "error", error: e?.message || "UPLOAD_FAILED" } : it
          );
          return next;
        });
      }
    }
  }

  async function handleChooseVideo(files: FileList | File[] | null) {
    const fileArr: File[] = Array.isArray(files) ? files : files ? Array.from(files) : [];
    if (!fileArr || fileArr.length === 0) return;
    if (maxVideo <= 0) return;
    if (hasVideo) return;
    const file = fileArr[0];

    const item: MediaDraftItem = {
      id: uid(),
      kind: "video",
      name: file.name,
      status: "uploading",
      progress: 0,
    };

    onChange((prev) => ({ ...prev, video: item }) as any);

    try {
      // Important: allow React to paint the "0%" item before starting heavy network work.
      // Some WebViews (esp. iOS) won't reliably emit progress events if we start immediately
      // after the file picker closes.
      await new Promise((r) => setTimeout(r, 0));

      // Progress watchdog: if the first progress event is delayed, bump to 1% so UI isn't stuck at 0.
      // (Actual progress updates will override this.)
      watchdog = window.setTimeout(() => {
        onChange((prev) =>
          ({
            ...prev,
            video:
              prev.video && prev.video.id === item.id && prev.video.status === "uploading" && (prev.video.progress ?? 0) === 0
                ? { ...prev.video, progress: 1 }
                : prev.video,
          }) as any
        );
      }, 800);

      // Use signed direct upload for video to avoid route body limits and improve progress reliability.
      const result = await uploadTempSignedWithProgress({
        kind: "video",
        file,
        apiHeaders,
        onProgress: (p) => {
          onChange((prev) =>
            ({
              ...prev,
              video: prev.video && prev.video.id === item.id ? { ...prev.video, progress: p } : prev.video,
            }) as any
          );
        },
      });

      if (watchdog) window.clearTimeout(watchdog);

      // Best-effort: generate a thumbnail from the local file and upload it as a temp image.
      // This keeps UI unchanged while enabling poster + library browsing.
      let thumbUrl: string | undefined;
      let thumbTmpPath: string | undefined;
      const thumbFile = await generateVideoThumbnail(file);
      if (thumbFile) {
        try {
          const thumbRes = await uploadTempWithProgress({
            kind: "image",
            file: thumbFile,
            apiHeaders,
            onProgress: () => {},
          });
          thumbUrl = thumbRes.url;
          thumbTmpPath = thumbRes.tmp_path;
        } catch {
          // ignore thumbnail upload errors
        }
      }

      onChange((prev) => ({
        ...prev,
        video:
          prev.video && prev.video.id === item.id
            ? {
                ...prev.video,
                status: "done",
                progress: 100,
                tmp_path: result.tmp_path,
                url: result.url,
                thumbnail_url: thumbUrl,
                thumbnail_tmp_path: thumbTmpPath,
              }
            : prev.video,
      }) as any);
    } catch (e: any) {
      if (watchdog) window.clearTimeout(watchdog);
      onChange((prev) => ({
        ...prev,
        video: prev.video && prev.video.id === item.id ? { ...prev.video, status: "error", error: e?.message || "UPLOAD_FAILED" } : prev.video,
      }) as any);
    }
  }

  async function removeImage(id: string) {
    const target = images.find((x) => x.id === id);
    onChange((prev) => ({ ...prev, images: (prev.images || []).filter((x) => x.id !== id) }) as any);
    if (target?.tmp_path) {
      await deleteTemp(target.tmp_path, apiHeaders);
    }
  }

  async function removeVideo() {
    const target = video;
    onChange((prev) => ({ ...prev, video: null }) as any);
    if (target?.tmp_path) {
      await deleteTemp(target.tmp_path, apiHeaders);
    }
    if (target?.thumbnail_tmp_path) {
      await deleteTemp(target.thumbnail_tmp_path, apiHeaders);
    }
  }

  function removeLibraryImage(url: string) {
    onChange((prev) => ({
      ...prev,
      libraryImages: (prev.libraryImages || []).filter((x) => x !== url),
    }) as any);
  }

  function removeLibraryVideo() {
    onChange((prev) => ({ ...prev, libraryVideoUrl: null }) as any);
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-medium">Media ({hasVideo ? 1 : 0} video + {totalImagesCount} images)</div>
      <div className="mt-1 text-xs text-muted-foreground">Images: {totalImagesCount}/{maxImages}, Video: {hasVideo ? 1 : 0}/{maxVideo}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* File picker reliability: use an invisible input overlay INSIDE the button.
            This avoids programmatic .click() issues in some WebViews/Pi browsers. */}
        <div
          className={
            "relative inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted " +
            (disabled || totalImagesCount >= maxImages ? "cursor-not-allowed opacity-50" : "cursor-pointer")
          }
        >
          <span>Chọn ảnh từ thiết bị</span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={disabled || totalImagesCount >= maxImages}
            onChange={(e) => {
              const list = e.currentTarget.files;
              // Copy out before clearing.
              const files = list ? Array.from(list) : [];
              e.currentTarget.value = "";
              handleChooseImages(files);
            }}
          />
        </div>

        <div
          className={
            "relative inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted " +
            (disabled || hasVideo ? "cursor-not-allowed opacity-50" : "cursor-pointer")
          }
        >
          <span>Chọn video từ thiết bị</span>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={disabled || hasVideo}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0] ? [e.currentTarget.files[0]] : [];
              e.currentTarget.value = "";
              handleChooseVideo(f);
            }}
          />
        </div>

        <AdminMediaPickerInline
          label="Chọn từ thư viện"
          disabled={disabled}
          maxImagesLeft={Math.max(0, maxImages - totalImagesCount)}
          canPickVideo={!hasVideo && maxVideo > 0}
          apiHeaders={apiHeaders}
          onPickImageUrls={(urls) => {
            if (!urls.length) return;
            onChange((prev) => ({
              ...prev,
              libraryImages: Array.from(new Set([...(prev.libraryImages || []), ...urls])).slice(0, maxImages),
            }) as any);
          }}
          onPickVideoUrl={(url) => {
            if (!url) return;
            onChange((prev) => ({ ...prev, libraryVideoUrl: url }) as any);
          }}
        />
      </div>

      {pendingCount > 0 ? (
        <div className="mt-3 text-xs text-muted-foreground">Đang upload: {pendingCount} file…</div>
      ) : null}

      {(images.length > 0 || video || libraryImages.length > 0 || libraryVideoUrl) ? (
        <div className="mt-3 space-y-2">
          {images.map((img) => (
            <div key={img.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">🖼️ {img.name}</div>
                {img.url && img.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.name} className="mt-2 h-12 w-20 rounded object-cover" />
                ) : null}
                {img.status === "uploading" ? (
                  <div className="mt-1 text-xs text-muted-foreground">Uploading… {formatPercent(img.progress)}</div>
                ) : null}
                {img.status === "done" ? (
                  <div className="mt-1 text-xs text-muted-foreground">Uploaded ✓</div>
                ) : null}
                {img.status === "error" ? (
                  <div className="mt-1 text-xs text-red-600">Upload lỗi: {img.error || ""}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="ml-3 rounded-md bg-red-100 px-3 py-2 text-xs font-medium text-red-700"
                onClick={() => removeImage(img.id)}
              >
                X
              </button>
            </div>
          ))}

          {libraryImages.map((url) => (
            <div key={url} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">📚🖼️ {url}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={url} className="mt-2 h-12 w-20 rounded object-cover" />
              </div>
              <button
                type="button"
                className="ml-3 rounded-md bg-red-100 px-3 py-2 text-xs font-medium text-red-700"
                onClick={() => removeLibraryImage(url)}
              >
                X
              </button>
            </div>
          ))}

          {libraryVideoUrl && !video ? (
            <div className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">📚🎥 {libraryVideoUrl}</div>
              </div>
              <button
                type="button"
                className="ml-3 rounded-md bg-red-100 px-3 py-2 text-xs font-medium text-red-700"
                onClick={() => removeLibraryVideo()}
              >
                X
              </button>
            </div>
          ) : null}

          {video ? (
            <div className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">🎥 {video.name}</div>
                {video.url && video.kind === "video" ? (
                  <div className="mt-1 text-xs text-muted-foreground truncate">{video.url}</div>
                ) : null}
                {video.status === "uploading" ? (
                  <div className="mt-1 text-xs text-muted-foreground">Uploading… {formatPercent(video.progress)}</div>
                ) : null}
                {video.status === "done" ? (
                  <div className="mt-1 text-xs text-muted-foreground">Uploaded ✓</div>
                ) : null}

                {/* Preview for videos (keeps UI structure; enables click/play) */}
                {video.status === "done" && video.url ? (
                  <video
                    className="mt-2 h-12 w-20 rounded object-cover"
                    src={video.url}
                    controls
                    playsInline
                    preload="metadata"
                    poster={video.thumbnail_url || undefined}
                  />
                ) : null}
                {video.status === "error" ? (
                  <div className="mt-1 text-xs text-red-600">Upload lỗi: {video.error || ""}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="ml-3 rounded-md bg-red-100 px-3 py-2 text-xs font-medium text-red-700"
                onClick={() => removeVideo()}
              >
                X
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
