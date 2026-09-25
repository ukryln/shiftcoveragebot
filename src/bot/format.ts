import { Keyboard } from "grammy";

// Used only when a shop's own timezone isn't available.
export const DEFAULT_TIMEZONE = "Pacific/Auckland";

export type ShopInfo = { name: string; timezone?: string | null };

export const staffMenu = new Keyboard().text("📅 My Shifts").text("💰 Sick Pay Claims").resized();

// Times are shown in the shop's own timezone — there's no "browser" for a bot
// reply to infer one from. Staff and managers can be linked to more than one
// shop, so the shop is named whenever we have it.
export function formatShiftLine(startIso: string, endIso: string, role: string, shop?: ShopInfo | null): string {
  const timeZone = shop?.timezone || DEFAULT_TIMEZONE;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dayFmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const base = `${dayFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)}`;
  return shop?.name ? `${base} @ ${shop.name}` : base;
}
