import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AddShiftForm } from "@/app/dashboard/shifts/add-shift-form";
import { ShiftsTable } from "@/app/dashboard/shifts/shifts-table";

export default async function ShiftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: managedShops } = await supabaseAdmin
    .from("shop_managers")
    .select("shops(id, name)")
    .eq("user_id", user!.id);

  const shop = managedShops?.[0]?.shops;

  if (!shop) {
    return (
      <div className="p-8">
        <p className="text-gray-700">
          You need to{" "}
          <Link href="/dashboard" className="underline">
            create a shop
          </Link>{" "}
          before scheduling shifts.
        </p>
      </div>
    );
  }

  const { data: staffLinks } = await supabaseAdmin
    .from("staff_shops")
    .select("staff(id, name, status)")
    .eq("shop_id", shop.id);

  const allStaff = (staffLinks ?? []).map((row) => row.staff).filter(Boolean);
  const assignableStaff = allStaff
    .filter((staffMember) => staffMember.status !== "archived")
    .map((staffMember) => ({ id: staffMember.id, name: staffMember.name }));

  const { data: shiftRows } = await supabaseAdmin
    .from("shifts")
    .select("id, staff_id, role_required, start_time, end_time, staff(name)")
    .eq("shop_id", shop.id)
    .order("start_time");

  const shifts = (shiftRows ?? []).map((row) => ({
    id: row.id,
    staff_id: row.staff_id,
    role_required: row.role_required,
    start_time: row.start_time,
    end_time: row.end_time,
    staffName: row.staff?.name ?? null,
  }));

  return (
    <div className="p-8">
      <Link href="/dashboard" className="text-sm text-gray-500 underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Shifts — {shop.name}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Times are shown and entered in your device&apos;s own timezone.
      </p>

      <ShiftsTable shifts={shifts} staffOptions={assignableStaff} />

      <AddShiftForm shopId={shop.id} staffOptions={assignableStaff} />
    </div>
  );
}
