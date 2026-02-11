"use client";

import * as React from "react";

import { fetchWithAuth } from "@/lib/api/fetch-with-auth";
import { supabaseBrowser } from "@/lib/supabase/client";

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
  // For library picks (already uploaded)
  library_url?: string;
  error?: string;
};

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
        if (xhr.status >= 200 && xhr.status < 300 && data?.ok && data?.path && data?.url) {
          resolve({ tmp_path: data.path, url: data.url });
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

// Minimal inline library picker placeholder to keep the existing UI button.
function AdminMediaPickerInline(props: {
  label: string;
  accept: string;
  onPick: (item: { url: string; type: "image" | "video" }) => void;
  disabled?: boolean;
}) {
  const { label, disabled } = props;
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
      disabled={disabled}
      onClick={() => {
        // For now, open the admin media tab where user can copy URL.
        // (No UI changes; keeps button functional.)
        window.open("/admin/media", "_blank", "noopener,noreferrer");
      }}
      aria-label={label}
    >
      {label}
    </button>
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

  async function handleChooseImages(files: FileList | null) {
    if (!files || files.length === 0) return;

    const allowed = Math.max(0, maxImages - totalImagesCount);
    const selected = Array.from(files).slice(0, allowed);
    if (selected.length === 0) return;

    // Add placeholders then upload.
    const newItems: MediaDraftItem[] = selected.map((f) => ({
      id: uid(),
      kind: "image",
      name: f.name,
      status: "uploading",
      progress: 0,
    }));

    onChange({
      ...value,
      images: [...images, ...newItems],
    });

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

  async function handleChooseVideo(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (maxVideo <= 0) return;
    if (hasVideo) return;
    const file = files[0];

    const item: MediaDraftItem = {
      id: uid(),
      kind: "video",
      name: file.name,
      status: "uploading",
      progress: 0,
    };

    onChange({
      ...value,
      video: item,
    });

    try {
      const result = await uploadTempWithProgress({
        kind: "video",
        file,
        // Use bearer headers from AdminShell.
        apiHeaders,
        onProgress: (p) => {
          onChange((prev) => ({
            ...prev,
            video: prev.video && prev.video.id === item.id ? { ...prev.video, progress: p } : prev.video,
          }) as any);
        },
      });

      onChange((prev) => ({
        ...prev,
        video: prev.video && prev.video.id === item.id ? { ...prev.video, status: "done", progress: 100, tmp_path: result.tmp_path, url: result.url } : prev.video,
      }) as any);
    } catch (e: any) {
      onChange((prev) => ({
        ...prev,
        video: prev.video && prev.video.id === item.id ? { ...prev.video, status: "error", error: e?.message || "UPLOAD_FAILED" } : prev.video,
      }) as any);
    }
  }

  async function removeImage(id: string) {
    const target = images.find((x) => x.id === id);
    onChange({
      ...value,
      images: images.filter((x) => x.id !== id),
    });
    if (target?.tmp_path) {
      await deleteTemp(target.tmp_path, apiHeaders);
    }
  }

  async function removeVideo() {
    const target = video;
    onChange({
      ...value,
      video: null,
    });
    if (target?.tmp_path) {
      await deleteTemp(target.tmp_path, apiHeaders);
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-medium">Media ({hasVideo ? 1 : 0} video + {totalImagesCount} images)</div>
      <div className="mt-1 text-xs text-muted-foreground">Images: {totalImagesCount}/{maxImages}, Video: {hasVideo ? 1 : 0}/{maxVideo}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* File pickers: do NOT use `display:none` because some browsers won't open picker via <label>. */}
        <button
          type="button"
          className={
            "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted " +
            (disabled || totalImagesCount >= maxImages ? "cursor-not-allowed opacity-50" : "cursor-pointer")
          }
          disabled={disabled || totalImagesCount >= maxImages}
          onClick={() => {
            if (disabled || totalImagesCount >= maxImages) return;
            imageInputRef.current?.click();
          }}
        >
          Chọn ảnh từ thiết bị
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={disabled || totalImagesCount >= maxImages}
          onChange={(e) => {
            const files = e.currentTarget.files;
            e.currentTarget.value = "";
            handleChooseImages(files);
          }}
        />

        <button
          type="button"
          className={
            "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted " +
            (disabled || hasVideo ? "cursor-not-allowed opacity-50" : "cursor-pointer")
          }
          disabled={disabled || hasVideo}
          onClick={() => {
            if (disabled || hasVideo) return;
            videoInputRef.current?.click();
          }}
        >
          Chọn video từ thiết bị
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          disabled={disabled || hasVideo}
          onChange={(e) => {
            const files = e.currentTarget.files;
            e.currentTarget.value = "";
            handleChooseVideo(files);
          }}
        />

        <AdminMediaPickerInline
          label="Chọn từ thư viện"
          accept="image/*,video/*"
          disabled={disabled}
          onPick={() => {
            // Intentionally no-op in this patch.
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

          {video ? (
            <div className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">🎥 {video.name}</div>
                {video.status === "uploading" ? (
                  <div className="mt-1 text-xs text-muted-foreground">Uploading… {formatPercent(video.progress)}</div>
                ) : null}
                {video.status === "done" ? (
                  <div className="mt-1 text-xs text-muted-foreground">Uploaded ✓</div>
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
