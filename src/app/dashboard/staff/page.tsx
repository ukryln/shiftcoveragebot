import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentShop } from "@/lib/current-shop";
import { AddStaffForm } from "@/app/dashboard/staff/add-staff-form";
import { BulkAddForm } from "@/app/dashboard/staff/bulk-add-form";
import { StaffTable } from "@/app/dashboard/staff/staff-table";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { shop } = await getCurrentShop(user!.id);

  if (!shop) {
    return (
      <p className="text-slate-600">
        You need to{" "}
        <Link href="/dashboard" className="text-indigo-600 underline">
          create a shop
        </Link>{" "}
        before adding staff.
      </p>
    );
  }

  const { data: staffLinks } = await supabaseAdmin
    .from("staff_shops")
    .select("staff(id, name, role, status, telegram_id)")
    .eq("shop_id", shop.id)
    .returns<
      { staff: { id: string; name: string; role: string; status: string; telegram_id: number | null } }[]
    >();

  const staffList = (staffLinks ?? []).map((row) => row.staff).filter(Boolean);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Staff — {shop.name}</h1>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <StaffTable staffList={staffList} botUsername={process.env.TELEGRAM_BOT_USERNAME!} />
      </div>

      <div className="mt-6 flex flex-wrap gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <AddStaffForm shopId={shop.id} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <BulkAddForm shopId={shop.id} />
        </div>
      </div>
    </div>
  );
}
