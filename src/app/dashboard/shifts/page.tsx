import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentShop } from "@/lib/current-shop";
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

  const { shop } = await getCurrentShop(user!.id);

  if (!shop) {
    return (
      <p className="text-slate-600">
        You need to{" "}
        <Link href="/dashboard" className="text-indigo-600 underline">
          create a shop
        </Link>{" "}
        before scheduling shifts.
      </p>
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
    .select("id, staff_id, start_time, end_time, covering_request_id")
    .eq("shop_id", shop.id)
    .gte("start_time", `${formatDateISO(addDays(monday, -1))}T00:00:00Z`)
    .lt("start_time", `${formatDateISO(addDays(monday, 8))}T00:00:00Z`);

  const rawShifts = (shiftRows ?? []).filter(
    (shift): shift is { id: string; staff_id: string; start_time: string; end_time: string; covering_request_id: string | null } =>
      Boolean(shift.staff_id)
  );

  const shiftIds = rawShifts.map((shift) => shift.id);
  const { data: coverageRows } = await supabaseAdmin
    .from("coverage_requests")
    .select("id, shift_id, status, sick_leave_status")
    .in("shift_id", shiftIds.length > 0 ? shiftIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("status", "filled");

  const approvedSickLeaveShiftIds = (coverageRows ?? [])
    .filter((row) => row.sick_leave_status === "approved")
    .map((row) => row.shift_id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Shifts — {shop.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Type a time range like &quot;10-3&quot; or &quot;4-9&quot; into a cell, or &quot;OFF&quot;
        (or leave it blank) for no shift. Times use your device&apos;s own timezone.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Link href={`/dashboard/shifts?week=${prevWeek}`} className="text-sm text-indigo-600 underline">
          ← Previous week
        </Link>
        <span className="text-sm font-medium text-slate-900">
          {weekDates[0]} – {weekDates[6]}
        </span>
        <Link href={`/dashboard/shifts?week=${nextWeek}`} className="text-sm text-indigo-600 underline">
          Next week →
        </Link>
      </div>

      {staffList.length === 0 ? (
        <p className="mt-4 text-slate-600">
          <Link href="/dashboard/staff" className="text-indigo-600 underline">
            Add staff
          </Link>{" "}
          first before scheduling shifts.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <RosterGrid
            shopId={shop.id}
            staffList={staffList}
            weekDates={weekDates}
            rawShifts={rawShifts}
            filledCoverageShiftIds={(coverageRows ?? []).map((row) => row.shift_id)}
            approvedSickLeaveShiftIds={approvedSickLeaveShiftIds}
          />
        </div>
      )}
    </div>
  );
}
