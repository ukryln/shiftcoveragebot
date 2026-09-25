"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setShopTimezone } from "@/app/actions/shops";

export function TimezoneSetting({ shopId, timezone }: { shopId: string; timezone: string }) {
  // The full list differs between server and browser, so it's filled in after
  // mount; until then the select only holds the current value.
  const [zones, setZones] = useState<string[]>([timezone]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const all = Intl.supportedValuesOf("timeZone");
    setZones(all.includes(timezone) ? all : [timezone, ...all]);
  }, [timezone]);

  function handleChange(next: string) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setShopTimezone(shopId, next);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <label htmlFor="timezone">Shop timezone:</label>
      <select
        id="timezone"
        value={timezone}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-2 py-1 text-slate-900"
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {saved && <span className="text-green-700">Saved</span>}
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
