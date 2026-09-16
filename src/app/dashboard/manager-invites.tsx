"use client";

import { useActionState, useState } from "react";
import { inviteManager } from "@/app/actions/shops";

type Manager = { email: string };
type PendingInvite = { email: string };

export function ManagerInvites({
  shopId,
  managers,
  pendingInvites,
}: {
  shopId: string;
  managers: Manager[];
  pendingInvites: PendingInvite[];
}) {
  const [state, action, pending] = useActionState(inviteManager, undefined);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!state?.inviteLink) return;
    navigator.clipboard.writeText(state.inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, () => {});
  }

  return (
    <div>
      <ul className="space-y-1 text-sm text-slate-700">
        {managers.map((manager) => (
          <li key={manager.email}>{manager.email}</li>
        ))}
        {pendingInvites.map((invite) => (
          <li key={invite.email} className="text-slate-400">
            {invite.email} <span className="italic">(invited, not accepted yet)</span>
          </li>
        ))}
      </ul>

      <form action={action} className="mt-4 flex gap-2">
        <input type="hidden" name="shopId" value={shopId} />
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@example.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          disabled={pending}
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Inviting..." : "Invite"}
        </button>
      </form>

      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}

      {state?.inviteLink && (
        <div className="mt-2">
          <p className="text-xs text-slate-500">Send them this link to accept:</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={state.inviteLink}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
            />
            <button onClick={handleCopy} className="shrink-0 text-xs text-indigo-600 underline">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
