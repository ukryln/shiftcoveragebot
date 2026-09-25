import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentShop } from "@/lib/current-shop";
import { AddStaffForm } from "@/app/dashboard/staff/add-staff-form";
import { BulkAddForm } from "@/app/dashboard/staff/bulk-add-form";
import { StaffTable } from "@/app/dashboard/staff/staff-table";
import { LinkExistingStaffForm } from "@/app/dashboard/staff/link-existing-staff-form";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { shop, allShops } = await getCurrentShop(user!.id);

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
  const staffIds = staffList.map((staffMember) => staffMember.id);

  // Sibling shops under the same manager — the pool cross-shop coverage can
  // draw staff from. See linkExistingStaffToShop for why this stays scoped
  // to shops this manager runs.
  const siblingShopIds = allShops.map((s) => s.id).filter((id) => id !== shop.id);

  const otherShopsByStaffId = new Map<string, string[]>();
  let eligibleToAdd: { id: string; name: string; role: string; otherShopNames: string[] }[] = [];

  if (siblingShopIds.length > 0) {
    const { data: siblingLinks } = await supabaseAdmin
      .from("staff_shops")
      .select("staff_id, staff(name, role, status), shop_id, shops(name)")
      .in("shop_id", siblingShopIds)
      .returns<
        {
          staff_id: string;
          staff: { name: string; role: string; status: string } | null;
          shop_id: string;
          shops: { name: string } | null;
        }[]
      >();

    const eligibleMap = new Map<string, { id: string; name: string; role: string; otherShopNames: string[] }>();
    for (const row of siblingLinks ?? []) {
      if (!row.shops) continue;
      // Also used to label existing staff in THIS shop's table with the
      // other shops they work at, regardless of role/status.
      const existingNames = otherShopsByStaffId.get(row.staff_id) ?? [];
      existingNames.push(row.shops.name);
      otherShopsByStaffId.set(row.staff_id, existingNames);

      if (!row.staff || row.staff.status === "archived") continue;
      if (staffIds.includes(row.staff_id)) continue;

      const existing = eligibleMap.get(row.staff_id);
      if (existing) {
        existing.otherShopNames.push(row.shops.name);
      } else {
        eligibleMap.set(row.staff_id, {
          id: row.staff_id,
          name: row.staff.name,
          role: row.staff.role,
          otherShopNames: [row.shops.name],
        });
      }
    }
    eligibleToAdd = [...eligibleMap.values()];
  }

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Staff — {shop.name}</h1>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <StaffTable
          staffList={staffList}
          botUsername={process.env.TELEGRAM_BOT_USERNAME!}
          otherShopsByStaffId={Object.fromEntries(otherShopsByStaffId)}
        />
        <LinkExistingStaffForm shopId={shop.id} eligibleStaff={eligibleToAdd} />
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
