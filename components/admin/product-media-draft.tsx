"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminBearer } from "@/components/admin/admin-shell";

export type MediaDraftItem = { path: string; type: "image" | "video" };

export type MediaDraftState = {
  deviceImages: File[];
  deviceVideo: File | null;
  library: MediaDraftItem[]; // items selected from Admin Media bucket
};

function guessTypeFromName(name: string): "image" | "video" {
  const lower = name.toLowerCase();
  if (lower.match(/\.(mp4|mov|webm|avi|mkv|m4v)$/)) return "video";
  return "image";
}

export function AdminProductMediaDraft({
  value,
  onChange,
  disabled,
}: {
  value: MediaDraftState;
  onChange: (v: MediaDraftState) => void;
  disabled?: boolean;
}) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefix, setPrefix] = useState("uploads/");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);

  const counts = useMemo(() => {
    const libImages = (value.library || []).filter((x) => x.type === "image").length;
    const libVideo = (value.library || []).some((x) => x.type === "video") ? 1 : 0;
    const deviceImages = (value.deviceImages || []).length;
    const deviceVideo = value.deviceVideo ? 1 : 0;
    return {
      images: libImages + deviceImages,
      videos: libVideo + deviceVideo,
      libImages,
      libVideo,
      deviceImages,
      deviceVideo,
    };
  }, [value]);

  const removeDeviceImage = (idx: number) => {
    const next = [...(value.deviceImages || [])];
    next.splice(idx, 1);
    onChange({ ...value, deviceImages: next });
  };

  const removeLibrary = (path: string) => {
    onChange({ ...value, library: (value.library || []).filter((x) => x.path !== path) });
  };

  const loadLibrary = async () => {
    setError(null);
    setBusy(true);
    try {
      const headers = { ...(await getAdminBearer()) } as any;
      const url = new URL("/api/admin/media/list", window.location.origin);
      url.searchParams.set("prefix", prefix || "uploads/");
      const res = await fetch(url.toString(), { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${json?.error || "LIST_FAILED"}${json?.detail ? `: ${json.detail}` : ""}`);
      setItems(json?.items || []);
    } catch (e: any) {
      setError(e?.message || "LIST_FAILED");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (showLibrary) loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLibrary]);

  const filteredItems = useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    if (!qq) return items;
    return (items || []).filter((it) => String(it?.name || "").toLowerCase().includes(qq));
  }, [items, q]);

  const togglePick = (path: string, type: "image" | "video") => {
    setError(null);
    const exists = (value.library || []).some((x) => x.path === path);
    if (exists) {
      removeLibrary(path);
      return;
    }
    // enforce limits
    const nextCounts = { ...counts };
    if (type === "video") {
      if (nextCounts.videos >= 1) {
        setError("VIDEO_LIMIT_EXCEEDED: Only 1 video per product");
        return;
      }
    } else {
      if (nextCounts.images >= 10) {
        setError("IMAGE_LIMIT_EXCEEDED: Max 10 images per product");
        return;
      }
    }
    onChange({ ...value, library: [...(value.library || []), { path, type }] });
  };

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Media (1 video + 10 images)</div>
      <div className="text-xs text-muted-foreground">Images: {counts.images}/10, Video: {counts.videos}/1</div>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      <div className="flex flex-wrap gap-2 items-center">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            // trigger file picker via hidden input
            const el = document.getElementById("tsbio_new_media_images") as HTMLInputElement | null;
            el?.click();
          }}
        >
          Chọn ảnh từ thiết bị
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || counts.videos >= 1}
          onClick={() => {
            const el = document.getElementById("tsbio_new_media_video") as HTMLInputElement | null;
            el?.click();
          }}
        >
          Chọn video từ thiết bị
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => setShowLibrary((v) => !v)}>
          {showLibrary ? "Ẩn thư viện" : "Chọn từ thư viện"}
        </Button>

        {/* Hidden inputs (no UI change, buttons drive them) */}
        <input
          id="tsbio_new_media_images"
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.currentTarget.value = "";
            if (!files.length) return;
            const remain = Math.max(0, 10 - counts.images);
            const picked = files.slice(0, remain);
            if (picked.length < files.length) setError("IMAGE_LIMIT_EXCEEDED: Max 10 images per product");
            onChange({ ...value, deviceImages: [...(value.deviceImages || []), ...picked] });
          }}
        />
        <input
          id="tsbio_new_media_video"
          className="hidden"
          type="file"
          accept="video/*"
          onChange={(e) => {
            const f = (e.target.files || [])[0] || null;
            e.currentTarget.value = "";
            if (!f) return;
            if (counts.videos >= 1) {
              setError("VIDEO_LIMIT_EXCEEDED: Only 1 video per product");
              return;
            }
            onChange({ ...value, deviceVideo: f });
          }}
        />
      </div>

      {/* Draft preview (what will be uploaded/attached after Save) */}
      {(value.deviceVideo || value.deviceImages?.length || value.library?.length) ? (
        <div className="border rounded-md p-2 grid gap-2">
          <div className="text-xs text-muted-foreground">Đã chọn (sẽ upload/attach ngay khi bấm Save)</div>

          {value.deviceVideo ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 break-all">🎬 {value.deviceVideo.name}</div>
              <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={() => onChange({ ...value, deviceVideo: null })}>
                X
              </Button>
            </div>
          ) : null}

          {(value.deviceImages || []).length ? (
            <div className="grid gap-1">
              {(value.deviceImages || []).map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 break-all">🖼️ {f.name}</div>
                  <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={() => removeDeviceImage(idx)}>
                    X
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {(value.library || []).length ? (
            <div className="grid gap-1">
              {(value.library || []).map((it) => (
                <div key={it.path} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 break-all">📎 {it.path}</div>
                  <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={() => removeLibrary(it.path)}>
                    X
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Chưa chọn media.</div>
      )}

      {showLibrary ? (
        <div className="border rounded-md p-2 grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="prefix" className="max-w-[220px]" disabled={disabled || busy} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search" className="max-w-[220px]" disabled={disabled || busy} />
            <Button type="button" variant="outline" disabled={disabled || busy} onClick={loadLibrary}>
              Refresh
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">Chọn media đã upload sẵn trong Admin → Media.</div>

          <div className="max-h-48 overflow-auto border rounded">
            {(filteredItems || []).slice(0, 200).map((it, idx) => {
              const path = String(it?.name || "");
              if (!path) return null;
              const type = guessTypeFromName(path);
              const checked = (value.library || []).some((x) => x.path === path);
              const disabledPick = disabled || (type === "video" ? counts.videos >= 1 && !checked : counts.images >= 10 && !checked);
              return (
                <label key={`${path}-${idx}`} className="flex items-center gap-2 p-2 text-xs border-b last:border-b-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabledPick}
                    onChange={() => togglePick(path, type)}
                  />
                  <div className="flex-1 break-all">{path}</div>
                  <div className="text-[10px] text-muted-foreground">{type}</div>
                </label>
              );
            })}
            {!filteredItems?.length ? <div className="p-2 text-xs text-muted-foreground">No items.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
