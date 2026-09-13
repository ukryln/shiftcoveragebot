"use client";

import { useState } from "react";
import { StaffRow } from "@/app/dashboard/staff/staff-row";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  status: string;
  telegram_id: number | null;
};

export function StaffTable({
  staffList,
  botUsername,
}: {
  staffList: StaffMember[];
  botUsername: string;
}) {
  const [showArchived, setShowArchived] = useState(false);

  const visibleStaff = showArchived
    ? staffList
    : staffList.filter((staffMember) => staffMember.status !== "archived");

  return (
    <div className="mt-4">
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        Show archived staff
      </label>

      {visibleStaff.length === 0 ? (
        <p className="mt-4 text-gray-600">No staff to show.</p>
      ) : (
        <table className="mt-4 w-full max-w-2xl border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 text-sm text-gray-500">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Role</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleStaff.map((staffMember) => (
              <StaffRow key={staffMember.id} staffMember={staffMember} botUsername={botUsername} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
