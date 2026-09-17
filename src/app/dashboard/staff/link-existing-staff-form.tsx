"use client";

import { useActionState } from "react";
import { linkExistingStaffToShop } from "@/app/actions/staff";

type EligibleStaff = { id: string; name: string; role: string; otherShopNames: string[] };

export function LinkExistingStaffForm({
  shopId,
  eligibleStaff,
}: {
  shopId: string;
  eligibleStaff: EligibleStaff[];
}) {
  const [state, action, pending] = useActionState(linkExistingStaffToShop, undefined);

  if (eligibleStaff.length === 0) {
    return null;
  }

  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
      <input type="hidden" name="shopId" value={shopId} />
      <div>
        <label htmlFor="staffId" className="block text-sm font-medium text-slate-700">
          Add someone from another shop
        </label>
        <select
          id="staffId"
          name="staffId"
          required
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        >
          {eligibleStaff.map((staffMember) => (
            <option key={staffMember.id} value={staffMember.id}>
              {staffMember.name} ({staffMember.role}) — also at {staffMember.otherShopNames.join(", ")}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={pending}
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add to this shop"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
