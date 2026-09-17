"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStaff, setStaffStatus } from "@/app/actions/staff";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  status: string;
  telegram_id: number | null;
};

export function StaffRow({
  staffMember,
  botUsername,
  otherShops = [],
}: {
  staffMember: StaffMember;
  botUsername: string;
  otherShops?: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(staffMember.name);
  const [role, setRole] = useState(staffMember.role);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const inviteLink = `https://t.me/${botUsername}?start=staff_${staffMember.id}`;

  function handleShowInvite() {
    setShowInviteLink(true);
    // Best-effort auto-copy — nice when it works, but the visible, selectable
    // text field below is the reliable fallback regardless of browser or
    // permissions support for the Clipboard API.
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, () => {});
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateStaff(staffMember.id, name, role);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleCancel() {
    setName(staffMember.name);
    setRole(staffMember.role);
    setError(null);
    setIsEditing(false);
  }

  function handleArchiveToggle() {
    const nextStatus = staffMember.status === "archived" ? (staffMember.telegram_id ? "active" : "pending") : "archived";
    startTransition(async () => {
      await setStaffStatus(staffMember.id, nextStatus);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <tr className="border-b border-gray-100">
        <td className="py-2 pr-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
          />
        </td>
        <td className="py-2 pr-2">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-gray-900"
          />
        </td>
        <td className="py-2 pr-2 capitalize text-gray-700">{staffMember.status}</td>
        <td className="py-2">
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={isPending} className="text-sm text-gray-900 underline disabled:opacity-50">
              Save
            </button>
            <button onClick={handleCancel} className="text-sm text-gray-500 underline">
              Cancel
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-2 text-gray-900">
        {staffMember.name}
        {otherShops.length > 0 && (
          <div className="text-xs font-normal text-slate-400">Also at: {otherShops.join(", ")}</div>
        )}
      </td>
      <td className="py-2 pr-2 text-gray-700">{staffMember.role}</td>
      <td className="py-2 pr-2 capitalize text-gray-700">{staffMember.status}</td>
      <td className="py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsEditing(true)} className="text-sm text-gray-900 underline">
            Edit
          </button>
          <button onClick={handleArchiveToggle} disabled={isPending} className="text-sm text-red-600 underline disabled:opacity-50">
            {staffMember.status === "archived" ? "Reactivate" : "Archive"}
          </button>
          {staffMember.status !== "archived" && !showInviteLink && (
            <button onClick={handleShowInvite} className="text-sm text-blue-600 underline">
              {staffMember.status === "pending" ? "Get invite link" : "Get link again"}
            </button>
          )}
        </div>
        {showInviteLink && (
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              onFocus={(e) => e.target.select()}
              className="w-64 rounded border border-gray-300 px-1 py-0.5 text-xs text-gray-700"
            />
            {copied && <span className="text-xs text-green-700">Copied!</span>}
          </div>
        )}
      </td>
    </tr>
  );
}
