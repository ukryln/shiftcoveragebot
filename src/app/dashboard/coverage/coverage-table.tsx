"use client";

import { useEffect, useState } from "react";

type Request = {
  id: string;
  reason: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  sick_leave_status: string | null;
  shifts: { start_time: string; end_time: string; role_required: string };
  requester: { id: string; name: string };
  coverer: { name: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-800",
  broadcasting: "bg-blue-100 text-blue-800",
  filled: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
  rejected: "bg-red-100 text-red-800",
};

const SICK_LEAVE_LABELS: Record<string, string> = {
  pending: "Sick pay: pending",
  approved: "Sick pay: approved",
  rejected: "Sick pay: rejected",
};

const SICK_LEAVE_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

function formatDateTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone });
}

// Same hydration-mismatch fix as the shifts page: server and browser can
// disagree on locale-dependent formatting, so only format after mount.
function FormattedTime({ iso, timeZone }: { iso: string; timeZone: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => setText(formatDateTime(iso, timeZone)), [iso, timeZone]);
  return <>{text ?? " "}</>;
}

export function CoverageTable({
  requests,
  statusLabels,
  timezone,
}: {
  requests: Request[];
  statusLabels: Record<string, string>;
  timezone: string;
}) {
  if (requests.length === 0) {
    return <p className="mt-6 text-slate-600">No coverage requests match these filters.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Shift</th>
            <th className="px-4 py-3">Requested by</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Covered by</th>
            <th className="px-4 py-3">Requested</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 text-slate-900">
                <FormattedTime iso={request.shifts.start_time} timeZone={timezone} /> ({request.shifts.role_required})
              </td>
              <td className="px-4 py-3 text-slate-700">{request.requester.name}</td>
              <td className="px-4 py-3 text-slate-500">{request.reason ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[request.status] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {statusLabels[request.status] ?? request.status}
                </span>
                {request.sick_leave_status && (
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${SICK_LEAVE_STYLES[request.sick_leave_status] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {SICK_LEAVE_LABELS[request.sick_leave_status] ?? request.sick_leave_status}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-700">{request.coverer?.name ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500">
                <FormattedTime iso={request.created_at} timeZone={timezone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
