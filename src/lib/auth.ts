import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// All data access goes through the service-role client, which bypasses
// database-level protections — so every server action must itself confirm the
// logged-in user actually manages the shop (or staff member) it's touching.

export async function getManagedShopIds(): Promise<{ userId: string; shopIds: string[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin.from("shop_managers").select("shop_id").eq("user_id", user.id);
  return { userId: user.id, shopIds: (data ?? []).map((row) => row.shop_id) };
}

export async function requireShopManager(
  shopId: string | null | undefined
): Promise<{ userId: string; shopIds: string[] } | { error: string }> {
  const managed = await getManagedShopIds();
  if (!managed) return { error: "You need to be logged in." };
  if (!shopId || !managed.shopIds.includes(shopId)) return { error: "You don't manage this shop." };
  return managed;
}

// A staff member may be linked to several shops; the user just needs to
// manage at least one of them.
export async function requireStaffManager(
  staffId: string | null | undefined
): Promise<{ userId: string; shopIds: string[] } | { error: string }> {
  const managed = await getManagedShopIds();
  if (!managed) return { error: "You need to be logged in." };
  if (!staffId) return { error: "Missing staff member." };

  const { data } = await supabaseAdmin
    .from("staff_shops")
    .select("shop_id")
    .eq("staff_id", staffId)
    .in("shop_id", managed.shopIds.length > 0 ? managed.shopIds : ["00000000-0000-0000-0000-000000000000"])
    .limit(1);

  if (!data || data.length === 0) return { error: "You don't manage this staff member." };
  return managed;
}
