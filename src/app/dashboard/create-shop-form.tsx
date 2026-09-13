"use client";

import { useActionState } from "react";
import { createShop } from "@/app/actions/shops";

export function CreateShopForm() {
  const [state, action, pending] = useActionState(createShop, undefined);

  return (
    <form action={action} className="mt-4 max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Shop name
        </label>
        <input
          id="name"
          name="name"
          type="text"
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
        {pending ? "Creating..." : "Create shop"}
      </button>
    </form>
  );
}
