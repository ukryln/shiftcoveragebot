import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RosterGrid } from "@/app/dashboard/shifts/roster-grid";
import { addDays, formatDateISO, getMondayOfWeek } from "@/lib/roster";

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: managedShops } = await supabaseAdmin
    .from("shop_managers")
    .select("shops(id, name)")
    .eq("user_id", user!.id)
    .returns<{ shops: { id: string; name: string } }[]>();

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

  const referenceDate = week ? new Date(`${week}T00:00:00`) : new Date();
  const monday = getMondayOfWeek(referenceDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => formatDateISO(addDays(monday, i)));
  const prevWeek = formatDateISO(addDays(monday, -7));
  const nextWeek = formatDateISO(addDays(monday, 7));

  const { data: staffLinks } = await supabaseAdmin
    .from("staff_shops")
    .select("staff(id, name, role, status)")
    .eq("shop_id", shop.id)
    .returns<{ staff: { id: string; name: string; role: string; status: string } }[]>();

  const staffList = (staffLinks ?? [])
    .map((row) => row.staff)
    .filter((staffMember): staffMember is NonNullable<typeof staffMember> => Boolean(staffMember))
    .filter((staffMember) => staffMember.status !== "archived")
    .map((staffMember) => ({ id: staffMember.id, name: staffMember.name, role: staffMember.role }));

  // Query a day of buffer on each side, in UTC. A shift's start_time is
  // stored as an absolute instant, but "which day it falls on" depends on
  // the viewer's own timezone (see RosterGrid) — comparing directly against
  // UTC day boundaries here would incorrectly drop shifts near the edges of
  // the week for any timezone ahead of or behind UTC. The client re-buckets
  // by the viewer's actual local date via isSameLocalDate.
  const { data: shiftRows } = await supabaseAdmin
    .from("shifts")
    .select("id, staff_id, start_time, end_time")
    .eq("shop_id", shop.id)
    .gte("start_time", `${formatDateISO(addDays(monday, -1))}T00:00:00Z`)
    .lt("start_time", `${formatDateISO(addDays(monday, 8))}T00:00:00Z`);

  const rawShifts = (shiftRows ?? []).filter(
    (shift): shift is { id: string; staff_id: string; start_time: string; end_time: string } =>
      Boolean(shift.staff_id)
  );

  return (
    <div className="p-8">
      <Link href="/dashboard" className="text-sm text-gray-500 underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Shifts — {shop.name}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Type a time range like &quot;10-3&quot; or &quot;4-9&quot; into a cell, or &quot;OFF&quot;
        (or leave it blank) for no shift. Times use your device&apos;s own timezone.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Link href={`/dashboard/shifts?week=${prevWeek}`} className="text-sm text-gray-700 underline">
          ← Previous week
        </Link>
        <span className="text-sm font-medium text-gray-900">
          {weekDates[0]} – {weekDates[6]}
        </span>
        <Link href={`/dashboard/shifts?week=${nextWeek}`} className="text-sm text-gray-700 underline">
          Next week →
        </Link>
      </div>

      {staffList.length === 0 ? (
        <p className="mt-4 text-gray-600">
          <Link href="/dashboard/staff" className="underline">
            Add staff
          </Link>{" "}
          first before scheduling shifts.
        </p>
      ) : (
        <RosterGrid shopId={shop.id} staffList={staffList} weekDates={weekDates} rawShifts={rawShifts} />
      )}
    </div>
  );
}
