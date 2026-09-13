"use client";

import { useActionState } from "react";
import { createShift, type ShiftFormState } from "@/app/actions/shifts";

type StaffOption = { id: string; name: string };

// datetime-local inputs give a timezone-less string (e.g. "2026-09-20T17:00").
// Converting via `new Date(...)` interprets it in the browser's own timezone,
// which is what we want here — see the note on the shifts page.
async function createShiftAction(prevState: ShiftFormState, formData: FormData) {
  const start = formData.get("startTime") as string;
  const end = formData.get("endTime") as string;
  if (start) formData.set("startTime", new Date(start).toISOString());
  if (end) formData.set("endTime", new Date(end).toISOString());
  return createShift(prevState, formData);
}

export function AddShiftForm({
  shopId,
  staffOptions,
}: {
  shopId: string;
  staffOptions: StaffOption[];
}) {
  const [state, action, pending] = useActionState(createShiftAction, undefined);

  return (
    <form
      action={action}
      className="mt-4 max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="shopId" value={shopId} />

      <div>
        <label htmlFor="staffId" className="block text-sm font-medium text-gray-700">
          Assign to
        </label>
        <select
          id="staffId"
          name="staffId"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="">Unassigned</option>
          {staffOptions.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="roleRequired" className="block text-sm font-medium text-gray-700">
          Role required
        </label>
        <input
          id="roleRequired"
          name="roleRequired"
          type="text"
          required
          placeholder="e.g. cook"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      <div>
        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
          Start
        </label>
        <input
          id="startTime"
          name="startTime"
          type="datetime-local"
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      <div>
        <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
          End
        </label>
        <input
          id="endTime"
          name="endTime"
          type="datetime-local"
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        disabled={pending}
        type="submit"
        className="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add shift"}
      </button>
    </form>
  );
}
