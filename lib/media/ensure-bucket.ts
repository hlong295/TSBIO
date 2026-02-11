import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Ensure a Storage bucket exists (best-effort).
 *
 * Notes:
 * - Server-side only (uses Supabase service role via getSupabaseAdmin()).
 * - If Storage APIs are unavailable, we don't hard-fail the request.
 */
export async function ensureStorageBucket(bucketName: string, opts?: { public?: boolean }) {
  try {
    const admin = getSupabaseAdmin();

    // supabase-js v2 supports listBuckets/createBucket on the storage client
    const { data: buckets, error } = await (admin.storage as any).listBuckets();
    if (error) return;

    const exists = (buckets || []).some((b: any) => b?.id === bucketName || b?.name === bucketName);
    if (exists) return;

    await (admin.storage as any).createBucket(bucketName, {
      public: opts?.public ?? true,
    });
  } catch {
    // best-effort only
  }
}
