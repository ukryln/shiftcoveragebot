import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentShop } from "@/lib/current-shop";
import { CreateShopForm } from "@/app/dashboard/create-shop-form";
import { ConnectTelegram } from "@/app/dashboard/connect-telegram";
import { ManageShop } from "@/app/dashboard/manage-shop";
import { ManagerInvites } from "@/app/dashboard/manager-invites";
import { NavCard } from "@/app/dashboard/nav-card";
import { TimezoneSetting } from "@/app/dashboard/timezone-setting";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { shop } = await getCurrentShop(user!.id);

  const { data: managerRow } = await supabaseAdmin
    .from("users")
    .select("telegram_id")
    .eq("id", user!.id)
    .maybeSingle();

  if (!shop) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Create your shop</h1>
        <p className="mt-1 text-sm text-slate-600">
          You don&apos;t have a shop yet — create one to get started.
        </p>
        <div className="mt-4">
          <CreateShopForm />
        </div>
      </div>
    );
  }

  const { data: managerLinks } = await supabaseAdmin
    .from("shop_managers")
    .select("users(email)")
    .eq("shop_id", shop.id)
    .returns<{ users: { email: string } }[]>();
  const managers = (managerLinks ?? []).map((row) => row.users).filter(Boolean);

  const { data: invites } = await supabaseAdmin
    .from("shop_invites")
    .select("email")
    .eq("shop_id", shop.id)
    .eq("status", "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ManageShop shopId={shop.id} shopName={shop.name} />
      </div>
      <p className="text-sm text-slate-500">Logged in as {user?.email}</p>
      <TimezoneSetting shopId={shop.id} timezone={shop.timezone} />

      <div className="grid gap-4 sm:grid-cols-3">
        <NavCard
          href="/dashboard/staff"
          title="Manage staff"
          description="Add, edit, and invite your team"
          icon="👥"
        />
        <NavCard
          href="/dashboard/shifts"
          title="Manage shifts"
          description="Build the weekly roster"
          icon="🗓️"
        />
        <NavCard
          href="/dashboard/coverage"
          title="Coverage requests"
          description="See live and past requests"
          icon="🔁"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Telegram</h2>
        <ConnectTelegram
          userId={user!.id}
          botUsername={process.env.TELEGRAM_BOT_USERNAME!}
          isConnected={Boolean(managerRow?.telegram_id)}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Managers</h2>
        <div className="mt-2">
          <ManagerInvites shopId={shop.id} managers={managers} pendingInvites={invites ?? []} />
        </div>
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <summary className="cursor-pointer font-semibold text-slate-900">+ Add another shop</summary>
        <div className="mt-4 max-w-sm">
          <CreateShopForm />
        </div>
      </details>
    </div>
  );
}
