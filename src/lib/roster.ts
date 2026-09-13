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

// Builds a Date for a given calendar date + hour/minute, in whichever
// timezone this code happens to run in (the browser, when called from the
// roster grid — consistent with how shift times work elsewhere in the app).
export function combineDateAndTime(dateISO: string, hour: number, minute: number): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

export function isSameLocalDate(iso: string, dateISO: string): boolean {
  return formatDateISO(new Date(iso)) === dateISO;
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

export function formatCellText(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    let h = d.getHours();
    const m = d.getMinutes();
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return m === 0 ? `${h}` : `${h}.${String(m).padStart(2, "0")}`;
  };
  return `${fmt(startIso)}-${fmt(endIso)}`;
}
