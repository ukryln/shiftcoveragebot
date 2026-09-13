import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logout } from "@/app/actions/auth";
import { CreateShopForm } from "@/app/dashboard/create-shop-form";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: managedShops } = await supabaseAdmin
    .from("shop_managers")
    .select("shops(id, name)")
    .eq("user_id", user!.id);

  const shops = (managedShops ?? []).map((row) => row.shops).filter(Boolean);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <form action={logout}>
          <button type="submit" className="rounded border border-gray-300 px-4 py-2 text-gray-700">
            Log out
          </button>
        </form>
      </div>
      <p className="mt-2 text-gray-600">Logged in as {user?.email}</p>

      {shops.length === 0 ? (
        <div className="mt-6">
          <p className="text-gray-700">You don&apos;t have a shop yet — create one to get started.</p>
          <CreateShopForm />
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900">Your shop{shops.length > 1 ? "s" : ""}</h2>
          <ul className="mt-2 space-y-1">
            {shops.map((shop) => (
              <li key={shop.id} className="text-gray-700">
                {shop.name}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-4">
            <Link href="/dashboard/staff" className="text-gray-900 underline">
              Manage staff →
            </Link>
            <Link href="/dashboard/shifts" className="text-gray-900 underline">
              Manage shifts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
