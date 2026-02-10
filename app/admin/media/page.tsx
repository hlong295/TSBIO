"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, getAdminBearer } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminMediaPage() {
  const [error, setError] = useState<string | null>(null);
  const [dbg, setDbg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  const load = async () => {
    setError(null);
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

      const res = await fetch(url.toString(), { method: "POST", headers: bearer, body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${json?.error || "UPLOAD_FAILED"}${json?.detail ? `: ${json.detail}` : ""}`);

      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "UPLOAD_FAILED");
    } finally {
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
        </div>

        <div className="text-sm text-muted-foreground">
          Bucket: <b>media</b> (list/upload via admin API)
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-2 text-xs bg-muted">
            <div className="col-span-7">Name</div>
            <div className="col-span-3">Updated</div>
            <div className="col-span-2 text-right">Size</div>
          </div>
          {(items || []).map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 p-2 text-xs border-t">
              <div className="col-span-7 break-all">{it.name}</div>
              <div className="col-span-3">{it.updated_at || ""}</div>
              <div className="col-span-2 text-right">{it.metadata?.size ?? ""}</div>
            </div>
          ))}
          {!items?.length ? <div className="p-2 text-sm text-muted-foreground">No items.</div> : null}
        </div>
      </div>
    </AdminShell>
  );
}
