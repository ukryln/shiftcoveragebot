import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AddStaffForm } from "@/app/dashboard/staff/add-staff-form";
import { BulkAddForm } from "@/app/dashboard/staff/bulk-add-form";
import { StaffTable } from "@/app/dashboard/staff/staff-table";

export default async function StaffPage() {
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
          before adding staff.
        </p>
      </div>
    );
  }

  const { data: staffLinks } = await supabaseAdmin
    .from("staff_shops")
    .select("staff(id, name, role, status, telegram_id)")
    .eq("shop_id", shop.id);

  const staffList = (staffLinks ?? []).map((row) => row.staff).filter(Boolean);

  return (
    <div className="p-8">
      <Link href="/dashboard" className="text-sm text-gray-500 underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Staff — {shop.name}</h1>

      <StaffTable staffList={staffList} />

      <div className="mt-8 flex flex-wrap gap-6">
        <AddStaffForm shopId={shop.id} />
        <BulkAddForm shopId={shop.id} />
      </div>
    </div>
  );
}
