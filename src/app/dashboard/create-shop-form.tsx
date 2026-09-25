"use client";

import { useActionState, useEffect, useState } from "react";
import { createShop } from "@/app/actions/shops";

export function CreateShopForm() {
  const [state, action, pending] = useActionState(createShop, undefined);
  // The creator's device timezone is a good default for the new shop; it can
  // be changed from the dashboard afterwards. Filled in after mount so server
  // and browser HTML match.
  const [timezone, setTimezone] = useState("");
  useEffect(() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="timezone" value={timezone} />
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Shop name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        disabled={pending}
        type="submit"
        className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create shop"}
      </button>
    </form>
  );
}
