"use client";

import { useActionState } from "react";
import { addStaff } from "@/app/actions/staff";

export function AddStaffForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState(addStaff, undefined);

  return (
    <form
      action={action}
      className="mt-4 max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="shopId" value={shopId} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <input
          id="role"
          name="role"
          type="text"
          required
          placeholder="e.g. cook, cashier"
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        disabled={pending}
        type="submit"
        className="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add staff member"}
      </button>
    </form>
  );
}
