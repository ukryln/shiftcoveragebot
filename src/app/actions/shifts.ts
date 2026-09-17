"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { findCrossShopConflict } from "@/lib/shift-conflicts";
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
