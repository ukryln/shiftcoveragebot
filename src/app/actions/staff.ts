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
