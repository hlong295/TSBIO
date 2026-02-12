"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAdminBearer } from "@/components/admin/admin-shell";

type MediaItem = {
  url: string;
  path: string;
  type: "image" | "video";
  display_order: number;
};

type MediaResponse = {
  ok?: boolean;
  media?: MediaItem[];
  thumbnail_url?: string | null;
  video_url?: string | null;
  error?: string;
  detail?: string;
};

export function AdminProductMedia({ productId }: { productId: string }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const images = media.filter((m) => m.type === "image").length;
    const videos = media.filter((m) => m.type === "video").length;
    return { images, videos };
  }, [media]);

  const refresh = async () => {
    setError(null);
    setLoading(true);
    try {
      const headers = { ...(await getAdminBearer()) } as any;
      const r = await fetch(`/api/admin/products/${productId}/media`, { headers });
      const j = (await r.json().catch(() => ({}))) as MediaResponse;
      if (!r.ok) throw new Error(`${j.error || "MEDIA_LOAD_FAILED"}${j.detail ? `: ${j.detail}` : ""}`);
      setMedia(j.media || []);
    } catch (e: any) {
      setError(e?.message || "MEDIA_LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const upload = async (kind: "image" | "video", files: File[]) => {
    setError(null);
    setBusy(true);
    try {
      const headers = { ...(await getAdminBearer()) } as any;
      const form = new FormData();
      if (kind === "image") {
        for (const f of files) form.append("files", f);
      } else {
        form.append("file", files[0]);
      }
      const r = await fetch(`/api/admin/products/${productId}/media?kind=${kind}`, {
        method: "POST",
        headers,
        body: form,
      });
      const j = (await r.json().catch(() => ({}))) as MediaResponse;
      if (!r.ok) throw new Error(`${j.error || "UPLOAD_FAILED"}${j.detail ? `: ${j.detail}` : ""}`);
      setMedia(j.media || []);
    } catch (e: any) {
      setError(e?.message || "UPLOAD_FAILED");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (path: string) => {
    if (!confirm("Remove this media?")) return;
    setError(null);
    setBusy(true);
    try {
      const headers = { ...(await getAdminBearer()) } as any;
      const r = await fetch(`/api/admin/products/${productId}/media?path=${encodeURIComponent(path)}`, {
        method: "DELETE",
        headers,
      });
      const j = (await r.json().catch(() => ({}))) as MediaResponse;
      if (!r.ok) throw new Error(`${j.error || "REMOVE_FAILED"}${j.detail ? `: ${j.detail}` : ""}`);
      setMedia(j.media || []);
    } catch (e: any) {
      setError(e?.message || "REMOVE_FAILED");
    } finally {
      setBusy(false);
    }
  };

  const images = useMemo(() => media.filter((m) => m.type === "image"), [media]);
  const video = useMemo(() => media.find((m) => m.type === "video") || null, [media]);

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">Media (1 video + 10 images)</div>
      <div className="text-xs text-muted-foreground">
        Images: {counts.images}/10, Video: {counts.videos}/1
      </div>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs">
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy || loading}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.currentTarget.value = "";
              if (files.length) upload("image", files);
            }}
          />
        </label>
        <label className="text-xs">
          <input
            type="file"
            accept="video/*"
            disabled={busy || loading || !!video}
            onChange={(e) => {
              const f = (e.target.files || [])[0];
              e.currentTarget.value = "";
              if (f) upload("video", [f]);
            }}
          />
        </label>
        <Button type="button" variant="outline" disabled={busy || loading} onClick={refresh}>
          Refresh
        </Button>
      </div>

      {loading ? <div className="text-xs text-muted-foreground">Loading media…</div> : null}

      {video ? (
        <div className="flex items-center gap-2 text-xs">
          <a href={video.url} target="_blank" rel="noreferrer" className="underline">
            Video
          </a>
          <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => remove(video.path)}>
            Remove
          </Button>
        </div>
      ) : null}

      {images.length ? (
        <div className="flex flex-wrap gap-2">
          {images
            .slice()
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map((img) => (
              <div key={img.path} className="border rounded p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-16 w-16 object-cover rounded" />
                <div className="flex justify-between items-center mt-1 gap-1">
                  <div className="text-[10px] text-muted-foreground">#{img.display_order}</div>
                  <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => remove(img.path)}>
                    X
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        !loading ? <div className="text-xs text-muted-foreground">No images</div> : null
      )}
    </div>
  );
}
