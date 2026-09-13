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

export function StaffRow({ staffMember }: { staffMember: StaffMember }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(staffMember.name);
  const [role, setRole] = useState(staffMember.role);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
      <td className="py-2 pr-2 text-gray-900">{staffMember.name}</td>
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
        </div>
      </td>
    </tr>
  );
}
