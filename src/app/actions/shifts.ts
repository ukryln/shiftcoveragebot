"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ShiftFormState = { error?: string } | undefined;

export async function createShift(
  _prevState: ShiftFormState,
  formData: FormData
): Promise<ShiftFormState> {
  const shopId = formData.get("shopId") as string;
  const staffId = formData.get("staffId") as string;
  const roleRequired = formData.get("roleRequired") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;

  if (!shopId) {
    return { error: "Missing shop." };
  }
  if (!roleRequired || !roleRequired.trim()) {
    return { error: "Role required is needed." };
  }
  if (!startTime || !endTime) {
    return { error: "Start and end time are required." };
  }
  if (new Date(endTime) <= new Date(startTime)) {
    return { error: "End time must be after start time." };
  }

  const { error } = await supabaseAdmin.from("shifts").insert({
    shop_id: shopId,
    staff_id: staffId || null,
    role_required: roleRequired.trim(),
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/shifts");
}

export async function updateShift(
  shiftId: string,
  staffId: string | null,
  roleRequired: string,
  startTime: string,
  endTime: string
): Promise<ShiftFormState> {
  if (!roleRequired.trim()) {
    return { error: "Role required is needed." };
  }
  if (!startTime || !endTime) {
    return { error: "Start and end time are required." };
  }
  if (new Date(endTime) <= new Date(startTime)) {
    return { error: "End time must be after start time." };
  }

  const { error } = await supabaseAdmin
    .from("shifts")
    .update({
      staff_id: staffId || null,
      role_required: roleRequired.trim(),
      start_time: startTime,
      end_time: endTime,
    })
    .eq("id", shiftId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/shifts");
}

export async function deleteShift(shiftId: string): Promise<ShiftFormState> {
  const { error } = await supabaseAdmin.from("shifts").delete().eq("id", shiftId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/shifts");
}
