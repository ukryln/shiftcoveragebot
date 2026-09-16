"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSelectedShop } from "@/app/actions/shops";

type Shop = { id: string; name: string };

export function ShopSwitcher({ currentShopId, allShops }: { currentShopId: string; allShops: Shop[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (allShops.length <= 1) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const shopId = e.target.value;
    startTransition(async () => {
      await setSelectedShop(shopId);
      router.refresh();
    });
  }

  return (
    <select
      value={currentShopId}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
    >
      {allShops.map((shop) => (
        <option key={shop.id} value={shop.id}>
          {shop.name}
        </option>
      ))}
    </select>
  );
}
