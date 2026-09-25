"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireShopManager, requireStaffManager } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type AddStaffFormState = { error?: string } | undefined;

export async function addStaff(
  _prevState: AddStaffFormState,
  formData: FormData
): Promise<AddStaffFormState> {
  const shopId = formData.get("shopId") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;

  if (!shopId) {
    return { error: "Missing shop." };
  }
  if (!name || !name.trim()) {
    return { error: "Staff name is required." };
  }
  if (!role || !role.trim()) {
    return { error: "Role is required." };
  }

  const auth = await requireShopManager(shopId);
  if ("error" in auth) return { error: auth.error };

  const { data: staffMember, error: staffError } = await supabaseAdmin
    .from("staff")
    .insert({ name: name.trim(), role: role.trim() })
    .select()
    .single();

  if (staffError) {
    return { error: staffError.message };
  }

  const { error: linkError } = await supabaseAdmin
    .from("staff_shops")
    .insert({ staff_id: staffMember.id, shop_id: shopId });

  if (linkError) {
    return { error: linkError.message };
  }

  revalidatePath("/dashboard/staff");
}

export type UpdateStaffResult = { error?: string } | undefined;

export async function updateStaff(
  staffId: string,
  name: string,
  role: string
): Promise<UpdateStaffResult> {
  if (!name.trim()) {
    return { error: "Staff name is required." };
  }
  if (!role.trim()) {
    return { error: "Role is required." };
  }

  const auth = await requireStaffManager(staffId);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabaseAdmin
    .from("staff")
    .update({ name: name.trim(), role: role.trim() })
    .eq("id", staffId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/staff");
}

export async function setStaffStatus(
  staffId: string,
  status: "pending" | "active" | "archived"
): Promise<UpdateStaffResult> {
  if (!["pending", "active", "archived"].includes(status)) {
    return { error: "Invalid status." };
  }

  const auth = await requireStaffManager(staffId);
  if ("error" in auth) return { error: auth.error };

  const { error } = await supabaseAdmin.from("staff").update({ status }).eq("id", staffId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/staff");
}

export type BulkAddStaffFormState = { error?: string; success?: string } | undefined;

function parsePastedRows(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      return { name: (parts[0] ?? "").trim(), role: (parts[1] ?? "").trim() };
    })
    .filter((row) => row.name && row.role);
}

export async function bulkAddStaff(
  _prevState: BulkAddStaffFormState,
  formData: FormData
): Promise<BulkAddStaffFormState> {
  const shopId = formData.get("shopId") as string;
  const raw = formData.get("rows") as string;

  if (!shopId) {
    return { error: "Missing shop." };
  }

  const auth = await requireShopManager(shopId);
  if ("error" in auth) return { error: auth.error };

  const rows = parsePastedRows(raw ?? "");

  if (rows.length === 0) {
    return {
      error:
        'No valid rows found. Each line should have a name and a role (e.g. "James, Cook"), or paste two columns straight from a spreadsheet.',
    };
  }

  const { data: inserted, error: staffError } = await supabaseAdmin
    .from("staff")
    .insert(rows)
    .select();

  if (staffError) {
    return { error: staffError.message };
  }

  const links = inserted.map((staffMember) => ({ staff_id: staffMember.id, shop_id: shopId }));
  const { error: linkError } = await supabaseAdmin.from("staff_shops").insert(links);

  if (linkError) {
    return { error: linkError.message };
  }

  revalidatePath("/dashboard/staff");
  return { success: `Added ${inserted.length} staff member${inserted.length > 1 ? "s" : ""}.` };
}

// Lets a manager add a staff member who already works at one of their OTHER
// shops onto this shop's staff list too — the basis for cross-shop coverage:
// once linked, that person automatically shows up in this shop's roster and
// gets pinged for its coverage broadcasts (broadcastRequest already just
// queries staff_shops by shop_id, so no other change was needed there).
// Restricted to staff already on a shop THIS manager runs, so one business
// can never reach into another's staff list.
export async function linkExistingStaffToShop(
  _prevState: UpdateStaffResult,
  formData: FormData
): Promise<UpdateStaffResult> {
  const shopId = formData.get("shopId") as string;
  const staffId = formData.get("staffId") as string;

  if (!shopId || !staffId) {
    return { error: "Missing shop or staff." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You need to be logged in." };
  }

  const { data: managedShopLinks } = await supabaseAdmin
    .from("shop_managers")
    .select("shop_id")
    .eq("user_id", user.id);
  const managedShopIds = (managedShopLinks ?? []).map((row) => row.shop_id);

  if (!managedShopIds.includes(shopId)) {
    return { error: "You don't manage this shop." };
  }

  const { data: staffShopLink } = await supabaseAdmin
    .from("staff_shops")
    .select("shop_id")
    .eq("staff_id", staffId)
    .in("shop_id", managedShopIds)
    .maybeSingle();

  if (!staffShopLink) {
    return { error: "That staff member doesn't belong to one of your other shops." };
  }

  const { error } = await supabaseAdmin.from("staff_shops").insert({ staff_id: staffId, shop_id: shopId });

  if (error) {
    if (error.code === "23505") {
      return { error: "That staff member is already added to this shop." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/staff");
}
