"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
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
