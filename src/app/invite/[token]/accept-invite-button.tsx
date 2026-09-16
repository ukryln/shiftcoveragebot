"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptShopInvite } from "@/app/actions/shops";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptShopInvite(token);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAccepted(result.shopName ?? "the shop");
    });
  }

  if (accepted) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-700">You&apos;re now a manager of {accepted}!</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded bg-indigo-600 py-2 text-sm text-white"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Accept this invite to become a manager of this shop.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={isPending}
        className="w-full rounded bg-indigo-600 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Accepting..." : "Accept invite"}
      </button>
    </div>
  );
}
