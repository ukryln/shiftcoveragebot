import { supabaseAdmin } from "./supabase/admin";

// Staff can now be linked to more than one shop (cross-shop coverage), so a
// shift assigned at one shop can silently double-book someone who already
// has an overlapping shift at another. Checks only across OTHER shops —
// same-shop overlaps (e.g. editing a shift in place) are a separate concern
// and already excluded by the caller passing its own shop as excludeShopId.
export async function findCrossShopConflict(params: {
  staffId: string;
  startTimeIso: string;
  endTimeIso: string;
  excludeShopId: string;
}): Promise<{ shopName: string } | null> {
  const { data } = await supabaseAdmin
    .from("shifts")
    .select("shop_id, shops(name)")
    .eq("staff_id", params.staffId)
    .neq("shop_id", params.excludeShopId)
    .lt("start_time", params.endTimeIso)
    .gt("end_time", params.startTimeIso)
    .limit(1)
    .returns<{ shop_id: string; shops: { name: string } | null }[]>();

  const row = data?.[0];
  return row ? { shopName: row.shops?.name ?? "another shop" } : null;
}
