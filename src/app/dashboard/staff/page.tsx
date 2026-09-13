import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AddStaffForm } from "@/app/dashboard/staff/add-staff-form";

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
    .select("staff(id, name, role, status)")
    .eq("shop_id", shop.id);

  const staffList = (staffLinks ?? []).map((row) => row.staff).filter(Boolean);

  return (
    <div className="p-8">
      <Link href="/dashboard" className="text-sm text-gray-500 underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Staff — {shop.name}</h1>

      {staffList.length === 0 ? (
        <p className="mt-4 text-gray-600">No staff added yet.</p>
      ) : (
        <table className="mt-4 w-full max-w-2xl border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 text-sm text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staffMember) => (
              <tr key={staffMember.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-900">{staffMember.name}</td>
                <td className="py-2 text-gray-700">{staffMember.role}</td>
                <td className="py-2 text-gray-700 capitalize">{staffMember.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AddStaffForm shopId={shop.id} />
    </div>
  );
}
