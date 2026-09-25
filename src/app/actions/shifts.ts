"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { findCrossShopConflict } from "@/lib/shift-conflicts";
import { requireShopManager } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type RosterCellResult = { id: string | null; error?: string };

// Handles create/update/delete for one roster grid cell in a single call:
// a null start/end means "OFF" or blank, i.e. delete the shift if one exists.
export async function saveRosterCell(input: {
  shiftId: string | null;
  shopId: string;
  staffId: string;
  roleRequired: string;
  startTimeIso: string | null;
  endTimeIso: string | null;
}): Promise<RosterCellResult> {
  const { shiftId, shopId, staffId, roleRequired, startTimeIso, endTimeIso } = input;

  const auth = await requireShopManager(shopId);
  if ("error" in auth) return { id: shiftId, error: auth.error };

  // The staff member must actually work at this shop, and an existing shift
  // being edited/deleted must belong to it — otherwise a caller could pass
  // their own shopId alongside someone else's staff or shift ids.
  const { data: staffLink } = await supabaseAdmin
    .from("staff_shops")
    .select("staff_id")
    .eq("staff_id", staffId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!staffLink) return { id: shiftId, error: "That staff member isn't on this shop's roster." };

  if (shiftId) {
    const { data: ownShift } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("id", shiftId)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (!ownShift) return { id: shiftId, error: "That shift doesn't belong to this shop." };
  }

  if (!startTimeIso || !endTimeIso) {
    if (shiftId) {
      const { error } = await supabaseAdmin.from("shifts").delete().eq("id", shiftId);
      if (error) {
        return { id: shiftId, error: error.message };
      }
    }
    revalidatePath("/dashboard/shifts");
    return { id: null };
  }

  const conflict = await findCrossShopConflict({
    staffId,
    startTimeIso,
    endTimeIso,
    excludeShopId: shopId,
  });
  if (conflict) {
    return { id: shiftId, error: `Already scheduled at ${conflict.shopName} during this time.` };
  }

  if (shiftId) {
    const { error } = await supabaseAdmin
      .from("shifts")
      .update({
        staff_id: staffId,
        role_required: roleRequired,
        start_time: startTimeIso,
        end_time: endTimeIso,
      })
      .eq("id", shiftId);

    if (error) {
      return { id: shiftId, error: error.message };
    }
    revalidatePath("/dashboard/shifts");
    return { id: shiftId };
  }

  const { data, error } = await supabaseAdmin
    .from("shifts")
    .insert({
      shop_id: shopId,
      staff_id: staffId,
      role_required: roleRequired,
      start_time: startTimeIso,
      end_time: endTimeIso,
    })
    .select()
    .single();

  if (error) {
    return { id: null, error: error.message };
  }

  revalidatePath("/dashboard/shifts");
  return { id: data.id };
}
