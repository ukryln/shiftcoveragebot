"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateShift, deleteShift } from "@/app/actions/shifts";

type StaffOption = { id: string; name: string };

type Shift = {
  id: string;
  staff_id: string | null;
  role_required: string;
  start_time: string;
  end_time: string;
  staffName: string | null;
};

function isoToLocalInputValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatShiftTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ShiftRow({ shift, staffOptions }: { shift: Shift; staffOptions: StaffOption[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [staffId, setStaffId] = useState(shift.staff_id ?? "");
  const [roleRequired, setRoleRequired] = useState(shift.role_required);
  const [startTime, setStartTime] = useState(isoToLocalInputValue(shift.start_time));
  const [endTime, setEndTime] = useState(isoToLocalInputValue(shift.end_time));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateShift(
        shift.id,
        staffId || null,
        roleRequired,
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString()
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleCancel() {
    setStaffId(shift.staff_id ?? "");
    setRoleRequired(shift.role_required);
    setStartTime(isoToLocalInputValue(shift.start_time));
    setEndTime(isoToLocalInputValue(shift.end_time));
    setError(null);
    setIsEditing(false);
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteShift(shift.id);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <tr className="border-b border-gray-100">
        <td className="py-2 pr-2">
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
          >
            <option value="">Unassigned</option>
            {staffOptions.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.id}>
                {staffMember.name}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 pr-2">
          <input
            value={roleRequired}
            onChange={(e) => setRoleRequired(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
          />
        </td>
        <td className="py-2 pr-2">
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
          />
        </td>
        <td className="py-2 pr-2">
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
          />
        </td>
        <td className="py-2">
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={isPending} className="text-sm text-gray-900 underline disabled:opacity-50">
              Save
            </button>
            <button onClick={handleCancel} className="text-sm text-gray-500 underline">
              Cancel
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-2 text-gray-900">
        {shift.staffName ?? <span className="text-gray-400">Unassigned</span>}
      </td>
      <td className="py-2 pr-2 text-gray-700">{shift.role_required}</td>
      <td className="py-2 pr-2 text-gray-700">{formatShiftTime(shift.start_time)}</td>
      <td className="py-2 pr-2 text-gray-700">{formatShiftTime(shift.end_time)}</td>
      <td className="py-2">
        {confirmingDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Delete this shift?</span>
            <button onClick={handleDelete} disabled={isPending} className="text-sm text-red-600 underline disabled:opacity-50">
              Confirm
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="text-sm text-gray-500 underline">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => setIsEditing(true)} className="text-sm text-gray-900 underline">
              Edit
            </button>
            <button onClick={() => setConfirmingDelete(true)} className="text-sm text-red-600 underline">
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
