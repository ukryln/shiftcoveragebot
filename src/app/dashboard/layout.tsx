import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentShop } from "@/lib/current-shop";
import { logout } from "@/app/actions/auth";
import { ShopSwitcher } from "@/app/dashboard/shop-switcher";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { shop, allShops } = await getCurrentShop(user!.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-bold text-indigo-600">
              Shift Coverage Bot
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {shop && <ShopSwitcher currentShopId={shop.id} allShops={allShops} />}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
