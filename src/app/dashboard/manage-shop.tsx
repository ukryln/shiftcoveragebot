"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameShop, deleteShop } from "@/app/actions/shops";

export function ManageShop({ shopId, shopName }: { shopId: string; shopName: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [renameState, renameAction, renamePending] = useActionState(renameShop, undefined);

  function handleDelete() {
    if (confirmText !== shopName) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteShop(shopId);
      if (result?.error) {
        setDeleteError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <form action={renameAction} className="flex items-center gap-2">
        <input type="hidden" name="shopId" value={shopId} />
        <input
          name="name"
          defaultValue={shopName}
          autoFocus
          className="rounded-lg border border-slate-300 px-2 py-1 text-xl font-bold text-slate-900"
        />
        <button
          type="submit"
          disabled={renamePending}
          onClick={() => setTimeout(() => setIsEditing(false), 0)}
          className="text-sm text-indigo-600 underline"
        >
          Save
        </button>
        <button type="button" onClick={() => setIsEditing(false)} className="text-sm text-slate-500 underline">
          Cancel
        </button>
        {renameState?.error && <p className="text-sm text-red-600">{renameState.error}</p>}
      </form>
    );
  }

  if (isDeleting) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          This permanently deletes <strong>{shopName}</strong> and all its staff assignments, shifts,
          and coverage request history. Type the shop name to confirm.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={shopName}
          className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1 text-slate-900"
        />
        {deleteError && <p className="mt-1 text-sm text-red-600">{deleteError}</p>}
        <div className="mt-2 flex gap-3">
          <button
            onClick={handleDelete}
            disabled={confirmText !== shopName || isPending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            {isPending ? "Deleting..." : "Delete shop"}
          </button>
          <button
            onClick={() => {
              setIsDeleting(false);
              setConfirmText("");
              setDeleteError(null);
            }}
            className="text-sm text-slate-500 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <h1 className="text-2xl font-bold text-slate-900">{shopName}</h1>
      <button onClick={() => setIsEditing(true)} className="text-sm text-indigo-600 underline">
        Rename
      </button>
      <button onClick={() => setIsDeleting(true)} className="text-sm text-red-600 underline">
        Delete
      </button>
    </div>
  );
}
