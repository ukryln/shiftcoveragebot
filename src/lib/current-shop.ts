import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ShopSummary = { id: string; name: string };

const SELECTED_SHOP_COOKIE = "selected_shop_id";

// Managers can manage more than one shop. Every dashboard page needs to know
// which one is "current" — backed by a cookie (set via the shop switcher) so
// it persists across navigation without ugly query params, falling back to
// the first shop the manager has if nothing is selected yet (or the cookie
// points at a shop they no longer manage).
export async function getCurrentShop(
  userId: string
): Promise<{ shop: ShopSummary | null; allShops: ShopSummary[] }> {
  const { data: managedShops } = await supabaseAdmin
    .from("shop_managers")
    .select("shops(id, name)")
    .eq("user_id", userId)
    .returns<{ shops: ShopSummary }[]>();

  const allShops = (managedShops ?? []).map((row) => row.shops).filter(Boolean);

  if (allShops.length === 0) {
    return { shop: null, allShops: [] };
  }

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(SELECTED_SHOP_COOKIE)?.value;
  const selected = allShops.find((shop) => shop.id === selectedId);

  return { shop: selected ?? allShops[0], allShops };
}

export { SELECTED_SHOP_COOKIE };
