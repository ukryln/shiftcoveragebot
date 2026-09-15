import { Keyboard } from "grammy";

// All shops are NZ-based for now, so shift times shown to staff use a fixed
// timezone rather than trying to guess one — there's no "browser" for a
// bot reply to infer a timezone from.
export const SHOP_TIMEZONE = "Pacific/Auckland";

export const staffMenu = new Keyboard().text("📅 My Shifts").resized();

export function formatShiftLine(startIso: string, endIso: string, role: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dayFmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: SHOP_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFmt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: SHOP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dayFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)}`;
}
