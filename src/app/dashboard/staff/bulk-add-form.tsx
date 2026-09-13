"use client";

import { useActionState } from "react";
import { bulkAddStaff } from "@/app/actions/staff";

export function BulkAddForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState(bulkAddStaff, undefined);

  return (
    <form
      action={action}
      className="mt-4 max-w-lg space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="shopId" value={shopId} />

      <div>
        <label htmlFor="rows" className="block text-sm font-medium text-gray-700">
          Paste from a spreadsheet
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Two columns: name, then role. Copy rows straight from Excel or Google Sheets and paste
          them below — one staff member per line.
        </p>
        <textarea
          id="rows"
          name="rows"
          rows={5}
          placeholder={"James\tCook\nRyan\tFront of House"}
          className="mt-2 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">{state.success}</p>}

      <button
        disabled={pending}
        type="submit"
        className="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add all"}
      </button>
    </form>
  );
}
