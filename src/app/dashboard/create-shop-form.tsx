"use client";

import { useActionState } from "react";
import { createShop } from "@/app/actions/shops";

export function CreateShopForm() {
  const [state, action, pending] = useActionState(createShop, undefined);

  return (
    <form action={action} className="space-y-4">
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
