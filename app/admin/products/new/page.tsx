"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell, getAdminBearer } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminRichTextEditor } from "@/components/admin/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AdminProductMediaDraft, type MediaDraftState } from "@/components/admin/product-media-draft";

type Kind = "farm" | "tsbio";

export default function AdminProductNewPage() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("farm");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceVnd, setPriceVnd] = useState<string>("");
  const [pricePi, setPricePi] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [stockQuantity, setStockQuantity] = useState<string>("0");
  const [isUnlimitedStock, setIsUnlimitedStock] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(true);
  const [isCombo, setIsCombo] = useState<boolean>(false);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isFlashsale, setIsFlashsale] = useState<boolean>(false);
  const [flashsalePercent, setFlashsalePercent] = useState<string>("");
  const [flashsaleEndAt, setFlashsaleEndAt] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [sellerId, setSellerId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [farmId, setFarmId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Media draft: allow selecting/uploading before product exists.
  // On Save: create product -> upload/copy media -> redirect to Edit.
  const [mediaDraft, setMediaDraft] = useState<MediaDraftState>({
    images: [],
    video: null,
    library: [],
    pendingCount: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const headers = { ...(await getAdminBearer()) } as any;
        const url = new URL("/api/admin/categories", window.location.origin);
        url.searchParams.set("kind", "product");
        const res = await fetch(url.toString(), { headers });
        const json = await res.json().catch(() => ({}));
        if (res.ok) setCategories(json?.items || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <AdminShell title="New Product">
      <div className="flex flex-col gap-4 max-w-xl">
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        {!error && status ? <div className="text-sm text-muted-foreground">{status}</div> : null}

        <div className="grid gap-2">
          <div className="text-sm font-medium">Kind</div>
          <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="farm">Farm product</SelectItem>
              <SelectItem value="tsbio">TSBIO product</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            * kind=farm sẽ yêu cầu farm_id (nếu DB của bạn đang dùng farm_id để phân loại).
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Name</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên sản phẩm" />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Description</div>
          <AdminRichTextEditor value={description} onChange={setDescription} placeholder="Mô tả (dán từ Word/Docs được)" />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Price (VND)</div>
          <Input value={priceVnd} onChange={(e) => setPriceVnd(e.target.value)} placeholder="e.g. 120000" />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Price (Pi)</div>
          <Input value={pricePi} onChange={(e) => setPricePi(e.target.value)} placeholder="e.g. 0.12" />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Farm ID (optional)</div>
          <Input value={farmId} onChange={(e) => setFarmId(e.target.value)} placeholder="farm_id (uuid)" />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Category (Product)</div>
          <Select value={categoryId || "_none"} onValueChange={(v) => setCategoryId(v === "_none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">(None)</SelectItem>
              {(categories || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Stock</div>
          <Input value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="e.g. 100" />
          <div className="text-xs text-muted-foreground">* stock_quantity=0 và is_unlimited_stock=true → không giới hạn.</div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Flags</div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isUnlimitedStock ? "default" : "outline"}
              onClick={() => setIsUnlimitedStock((v) => !v)}
            >
              Unlimited stock: {isUnlimitedStock ? "ON" : "OFF"}
            </Button>
            <Button type="button" variant={active ? "default" : "outline"} onClick={() => setActive((v) => !v)}>
              Active: {active ? "ON" : "OFF"}
            </Button>
            <Button type="button" variant={isCombo ? "default" : "outline"} onClick={() => setIsCombo((v) => !v)}>
              Combo: {isCombo ? "ON" : "OFF"}
            </Button>
            <Button type="button" variant={isFeatured ? "default" : "outline"} onClick={() => setIsFeatured((v) => !v)}>
              Featured: {isFeatured ? "ON" : "OFF"}
            </Button>
            <Button type="button" variant={isFlashsale ? "default" : "outline"} onClick={() => setIsFlashsale((v) => !v)}>
              Flashsale: {isFlashsale ? "ON" : "OFF"}
            </Button>
            <Button type="button" variant={isVerified ? "default" : "outline"} onClick={() => setIsVerified((v) => !v)}>
              Verified: {isVerified ? "ON" : "OFF"}
            </Button>
            <Button type="button" variant={isArchived ? "default" : "outline"} onClick={() => setIsArchived((v) => !v)}>
              Archived: {isArchived ? "ON" : "OFF"}
            </Button>
          </div>
          {isFlashsale ? (
            <div className="grid gap-2 pt-2">
              <div className="text-xs text-muted-foreground">Flashsale config (optional)</div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Flashsale percent</div>
                <Input value={flashsalePercent} onChange={(e) => setFlashsalePercent(e.target.value)} placeholder="e.g. 20" />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Flashsale end_at</div>
                <Input type="datetime-local" value={flashsaleEndAt} onChange={(e) => setFlashsaleEndAt(e.target.value)} />
                <div className="text-xs text-muted-foreground">* Nếu không nhập end_at, flashsale không có timer.</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Seller ID (root only)</div>
          <Input value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="seller_id (uuid)" />
          <div className="text-xs text-muted-foreground">* Nếu không nhập, hệ thống dùng user hiện tại (provider/self).</div>
        </div>

        <Separator />

        <AdminProductMediaDraft value={mediaDraft} onChange={setMediaDraft} disabled={saving} />

        <div className="flex gap-2">
          <Button
            disabled={saving}
            onClick={async () => {
              setError(null);
              setStatus(null);
              setSaving(true);
              try {
                setStatus("Đang tạo sản phẩm...");
                const headers = { "Content-Type": "application/json", ...(await getAdminBearer()) } as any;
                const body: any = {
                  name,
                  description,
                  price_vnd: priceVnd ? Number(priceVnd) : null,
                  price_pi: pricePi ? Number(pricePi) : null,
                  farm_id: kind === "farm" ? (farmId || null) : null,
                  category_id: categoryId || null,
                  stock_quantity: stockQuantity ? Number(stockQuantity) : 0,
                  is_unlimited_stock: isUnlimitedStock,
                  active,
                  is_combo: isCombo,
                  is_featured: isFeatured,
                  is_flashsale: isFlashsale,
                  flashsale_percent: flashsalePercent ? Number(flashsalePercent) : null,
                  flashsale_end_at: flashsaleEndAt ? new Date(flashsaleEndAt).toISOString() : null,
                  is_verified: isVerified,
                  is_archived: isArchived,
                  seller_id: sellerId || undefined,
                };
                const res = await fetch("/api/admin/products", {
                  method: "POST",
                  headers,
                  body: JSON.stringify(body),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(`${json?.error || "CREATE_FAILED"}${json?.detail ? `: ${json.detail}` : ""}`);
                const id = json?.item?.id;

                if (id) {
                  setStatus("Tạo sản phẩm thành công. Đang xử lý media...");
                } else {
                  setStatus("Tạo sản phẩm thành công.");
                }

                // If media is selected during creation, commit realtime temp uploads and attach library URLs.
                if (id) {
                  if (mediaDraft.pendingCount > 0) {
                    setError("MEDIA_UPLOADING: Vui lòng chờ upload hoàn tất trước khi Save.");
                  } else {
                    try {
                      const items: any[] = [];
                      for (const it of mediaDraft.images || []) {
                        if (it.status === "done" && (it.tmp_path || it.url)) {
                          items.push({ kind: "image", tmp_path: it.tmp_path, url: it.url, name: it.name });
                        }
                      }
                      if (mediaDraft.video && mediaDraft.video.status === "done" && (mediaDraft.video.tmp_path || mediaDraft.video.url)) {
                        items.push({ kind: "video", tmp_path: mediaDraft.video.tmp_path, url: mediaDraft.video.url, name: mediaDraft.video.name });
                      }
                      for (const lib of mediaDraft.library || []) {
                        if (lib?.url && (lib.type === "image" || lib.type === "video")) {
                          items.push({ kind: lib.type, url: lib.url, name: lib.url });
                        }
                      }

                      if (items.length) {
                        setStatus("Đang bind media...");
                        const r = await fetch(`/api/admin/products/${id}/media/commit`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", ...(await getAdminBearer()) } as any,
                          body: JSON.stringify({ items }),
                        });
                        const j = await r.json().catch(() => ({}));
                        if (!r.ok) throw new Error(`${j?.error || "MEDIA_COMMIT_FAILED"}${j?.detail ? `: ${j.detail}` : ""}`);
                      }
                    } catch (e: any) {
                      // Keep product created; show error on create page and still navigate to edit.
                      setError(e?.message || "MEDIA_AFTER_CREATE_FAILED");
                    }
                  }
                }
                const target = id ? `/admin/products/${id}` : "/admin/products";
                setStatus("Hoàn tất. Đang chuyển trang...");
                // Prefer Next router, but add a hard fallback in case router is flaky in some environments.
                try {
                  router.replace(target);
                } catch {
                  // ignore
                }
                setTimeout(() => {
                  try {
                    window.location.href = target;
                  } catch {
                    // ignore
                  }
                }, 250);
              } catch (e: any) {
                setError(e?.message || "CREATE_FAILED");
              } finally {
                setSaving(false);
              }
            }}
          >
            Save
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
