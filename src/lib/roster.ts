// Shared date/time helpers for the weekly roster grid. Kept as plain
// functions (no locale-dependent formatting) so the same output is produced
// whether called on the server or in the browser — avoids React hydration
// mismatches, since day-of-week/date math here never depends on timezone or
// locale, only on the calendar date itself.

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Every shop has its own timezone, and shift times are always read and
// written in that zone — never the viewer's device zone or the server's — so
// a manager travelling, or a server in another country, can't shift a roster.

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

// The absolute moment when the wall clock in `tz` reads dateISO + hour:minute.
export function combineDateAndTime(dateISO: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const wanted = Date.UTC(y, m - 1, d, hour, minute, 0);
  let guess = wanted;
  // Two passes converge even across a daylight-saving change.
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), tz);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess -= shown - wanted;
  }
  return new Date(guess);
}

export function dateISOInZone(iso: string | Date, tz: string): string {
  const p = zonedParts(new Date(iso), tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function hourInZone(iso: string, tz: string): number {
  return zonedParts(new Date(iso), tz).hour;
}

export function isSameLocalDate(iso: string, dateISO: string, tz: string): boolean {
  return dateISOInZone(iso, tz) === dateISO;
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function dayLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${DAY_NAMES[dow]} ${m}/${d}`;
}

export type Period = "lunch" | "dinner";

export type ParseResult =
  | { kind: "off" }
  | { kind: "invalid" }
  | { kind: "range"; startHour: number; startMinute: number; endHour: number; endMinute: number };

function parseHourToken(token: string): { hour: number; minute: number } | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const [h, m] = trimmed.split(".");
  const hour = Number(h);
  const minute = m ? Number(m) : 0;
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 1 || hour > 12) return null;
  return { hour, minute };
}

// Restaurant shorthand has no AM/PM marker — "10-3" on a lunch row means
// 10am-3pm, the same text on a dinner row would mean 10pm-3am. We rely on
// which row (lunch/dinner) the cell is in to disambiguate, matching how
// people already read these sheets.
function to24Hour(hour: number, period: Period): number {
  if (period === "lunch") {
    // 6-12 stay as the same hour (6am-12pm); 1-5 become afternoon (1pm-5pm)
    return hour >= 6 && hour <= 12 ? hour : hour + 12;
  }
  // dinner: 1-11 become PM; 12 stays as-is (noon prep, rare but harmless)
  return hour >= 1 && hour <= 11 ? hour + 12 : hour;
}

export function parseCellText(text: string, period: Period): ParseResult {
  const cleaned = text.trim();
  if (!cleaned || cleaned.toUpperCase() === "OFF") {
    return { kind: "off" };
  }

  const parts = cleaned.split("-");
  if (parts.length !== 2) {
    return { kind: "invalid" };
  }

  const start = parseHourToken(parts[0]);
  const end = parseHourToken(parts[1]);
  if (!start || !end) {
    return { kind: "invalid" };
  }

  return {
    kind: "range",
    startHour: to24Hour(start.hour, period),
    startMinute: start.minute,
    endHour: to24Hour(end.hour, period),
    endMinute: end.minute,
  };
}

export function formatCellText(startIso: string, endIso: string, tz: string): string {
  const fmt = (iso: string) => {
    const p = zonedParts(new Date(iso), tz);
    let h = p.hour;
    const m = p.minute;
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return m === 0 ? `${h}` : `${h}.${String(m).padStart(2, "0")}`;
  };
  return `${fmt(startIso)}-${fmt(endIso)}`;
}
