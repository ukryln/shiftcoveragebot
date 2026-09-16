import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentShop } from "@/lib/current-shop";
import { CoverageTable } from "@/app/dashboard/coverage/coverage-table";

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Pending approval",
  broadcasting: "Broadcasting",
  filled: "Filled",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; staff?: string }>;
}) {
  const { status, staff } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { shop } = await getCurrentShop(user!.id);

  if (!shop) {
    return (
      <div>
        <p className="text-slate-600">
          You need to <Link href="/dashboard" className="text-indigo-600 underline">create a shop</Link>{" "}
          before there's any coverage history to show.
        </p>
      </div>
    );
  }

  const { data: shopShifts } = await supabaseAdmin.from("shifts").select("id").eq("shop_id", shop.id);
  const shiftIds = (shopShifts ?? []).map((row) => row.id);

  const { data: staffLinks } = await supabaseAdmin
    .from("staff_shops")
    .select("staff(id, name)")
    .eq("shop_id", shop.id)
    .returns<{ staff: { id: string; name: string } }[]>();
  const staffOptions = (staffLinks ?? []).map((row) => row.staff).filter(Boolean);

  let query = supabaseAdmin
    .from("coverage_requests")
    .select(
      `id, reason, status, created_at, resolved_at, sick_leave_status,
       shifts!coverage_requests_shift_id_fkey(start_time, end_time, role_required),
       requester:staff!coverage_requests_requested_by_fkey(id, name),
       coverer:staff!coverage_requests_covered_by_fkey(name)`
    )
    .in("shift_id", shiftIds.length > 0 ? shiftIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (staff) {
    query = query.eq("requested_by", staff);
  }

  const { data: requests } = await query.returns<
    {
      id: string;
      reason: string | null;
      status: string;
      created_at: string;
      resolved_at: string | null;
      sick_leave_status: string | null;
      shifts: { start_time: string; end_time: string; role_required: string };
      requester: { id: string; name: string };
      coverer: { name: string } | null;
    }[]
  >();

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Coverage requests — {shop.name}</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <form className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Status</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700"
          >
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {staff && <input type="hidden" name="staff" value={staff} />}
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700">
            Apply
          </button>
        </form>

        <form className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Staff</label>
          <select
            name="staff"
            defaultValue={staff ?? ""}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700"
          >
            <option value="">All</option>
            {staffOptions.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.id}>
                {staffMember.name}
              </option>
            ))}
          </select>
          {status && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700">
            Apply
          </button>
        </form>

        {(status || staff) && (
          <Link href="/dashboard/coverage" className="text-sm text-indigo-600 underline self-center">
            Clear filters
          </Link>
        )}
      </div>

      <CoverageTable requests={requests ?? []} statusLabels={STATUS_LABELS} />
    </div>
  );
}
