"use client";

import { ShiftRow } from "@/app/dashboard/shifts/shift-row";

type StaffOption = { id: string; name: string };

type Shift = {
  id: string;
  staff_id: string | null;
  role_required: string;
  start_time: string;
  end_time: string;
  staffName: string | null;
};

export function ShiftsTable({
  shifts,
  staffOptions,
}: {
  shifts: Shift[];
  staffOptions: StaffOption[];
}) {
  if (shifts.length === 0) {
    return <p className="mt-4 text-gray-600">No shifts scheduled yet.</p>;
  }

  return (
    <table className="mt-4 w-full max-w-3xl border-collapse text-left">
      <thead>
        <tr className="border-b border-gray-200 text-sm text-gray-500">
          <th className="py-2 pr-2">Staff</th>
          <th className="py-2 pr-2">Role</th>
          <th className="py-2 pr-2">Start</th>
          <th className="py-2 pr-2">End</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {shifts.map((shift) => (
          <ShiftRow key={shift.id} shift={shift} staffOptions={staffOptions} />
        ))}
      </tbody>
    </table>
  );
}
