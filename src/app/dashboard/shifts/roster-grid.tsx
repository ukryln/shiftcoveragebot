"use client";

import { Fragment, useEffect, useState } from "react";
import { saveRosterCell } from "@/app/actions/shifts";
import {
  combineDateAndTime,
  dayLabel,
  formatCellText,
  isSameLocalDate,
  parseCellText,
  type Period,
} from "@/lib/roster";

type StaffMember = { id: string; name: string; role: string };
type RawShift = {
  id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  covering_request_id: string | null;
};

type CellState = {
  id: string | null;
  text: string;
  invalid: boolean;
  // Given away and covered by someone else — excluded from this staff
  // member's total, shown in red as a historical record.
  givenAway: boolean;
  // This cell exists because this staff member picked up someone else's
  // shift — counts toward their total, shown in blue.
  covering: boolean;
  // A manager approved a sick pay claim for this given-away shift — still
  // shown red, but its hours count back into the weekly total.
  sickLeaveApproved: boolean;
};

function emptyRow(length: number): CellState[] {
  return Array.from({ length }, () => ({
    id: null,
    text: "",
    invalid: false,
    givenAway: false,
    covering: false,
    sickLeaveApproved: false,
  }));
}

function emptyGrid(staffList: StaffMember[], dayCount: number) {
  return Object.fromEntries(
    staffList.map((staffMember) => [
      staffMember.id,
      { lunch: emptyRow(dayCount), dinner: emptyRow(dayCount) },
    ])
  );
}

function cellHours(cell: CellState, period: Period): number {
  if (cell.givenAway && !cell.sickLeaveApproved) return 0;
  const parsed = parseCellText(cell.text, period);
  if (parsed.kind !== "range") return 0;
  const start = parsed.startHour + parsed.startMinute / 60;
  const end = parsed.endHour + parsed.endMinute / 60;
  return Math.max(0, end - start);
}

export function RosterGrid({
  shopId,
  staffList,
  weekDates,
  rawShifts,
  filledCoverageShiftIds,
  approvedSickLeaveShiftIds,
}: {
  shopId: string;
  staffList: StaffMember[];
  weekDates: string[];
  rawShifts: RawShift[];
  filledCoverageShiftIds: string[];
  approvedSickLeaveShiftIds: string[];
}) {
  const [grid, setGrid] = useState(() => emptyGrid(staffList, weekDates.length));

  // Formatting shift times depends on the viewer's own timezone, which can
  // differ from the server's — computing it only after mount keeps the
  // server-rendered and first client-rendered HTML identical (see the fix
  // for the same issue on the old shifts list page).
  useEffect(() => {
    const next = emptyGrid(staffList, weekDates.length);
    const filledSet = new Set(filledCoverageShiftIds);
    const sickApprovedSet = new Set(approvedSickLeaveShiftIds);

    for (const staffMember of staffList) {
      const staffShifts = rawShifts.filter((shift) => shift.staff_id === staffMember.id);

      weekDates.forEach((dateISO, dayIndex) => {
        const dayShifts = staffShifts
          .filter((shift) => isSameLocalDate(shift.start_time, dateISO))
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
          .slice(0, 2);

        dayShifts.forEach((shift, i) => {
          const period: Period =
            dayShifts.length === 2
              ? i === 0
                ? "lunch"
                : "dinner"
              : new Date(shift.start_time).getHours() < 15
                ? "lunch"
                : "dinner";

          next[staffMember.id][period][dayIndex] = {
            id: shift.id,
            text: formatCellText(shift.start_time, shift.end_time),
            invalid: false,
            givenAway: filledSet.has(shift.id),
            covering: Boolean(shift.covering_request_id),
            sickLeaveApproved: sickApprovedSet.has(shift.id),
          };
        });
      });
    }

    setGrid(next);
  }, [rawShifts, staffList, weekDates, filledCoverageShiftIds, approvedSickLeaveShiftIds]);

  function updateCellText(staffId: string, period: Period, dayIndex: number, text: string) {
    setGrid((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [period]: prev[staffId][period].map((cell, i) =>
          i === dayIndex ? { ...cell, text, invalid: false } : cell
        ),
      },
    }));
  }

  async function commitCell(staffMember: StaffMember, period: Period, dayIndex: number) {
    const cell = grid[staffMember.id][period][dayIndex];
    const dateISO = weekDates[dayIndex];
    const parsed = parseCellText(cell.text, period);

    if (parsed.kind === "invalid") {
      setGrid((prev) => ({
        ...prev,
        [staffMember.id]: {
          ...prev[staffMember.id],
          [period]: prev[staffMember.id][period].map((c, i) =>
            i === dayIndex ? { ...c, invalid: true } : c
          ),
        },
      }));
      return;
    }

    const startTimeIso =
      parsed.kind === "range"
        ? combineDateAndTime(dateISO, parsed.startHour, parsed.startMinute).toISOString()
        : null;
    const endTimeIso =
      parsed.kind === "range"
        ? combineDateAndTime(dateISO, parsed.endHour, parsed.endMinute).toISOString()
        : null;

    const result = await saveRosterCell({
      shiftId: cell.id,
      shopId,
      staffId: staffMember.id,
      roleRequired: staffMember.role,
      startTimeIso,
      endTimeIso,
    });

    setGrid((prev) => ({
      ...prev,
      [staffMember.id]: {
        ...prev[staffMember.id],
        [period]: prev[staffMember.id][period].map((c, i) => {
          if (i !== dayIndex) return c;
          if (result.error) return { ...c, invalid: true };
          if (!result.id) return { ...c, id: null, text: "", invalid: false, givenAway: false, covering: false, sickLeaveApproved: false };
          return { ...c, id: result.id, text: formatCellText(startTimeIso!, endTimeIso!), invalid: false };
        }),
      },
    }));
  }

  function cellClasses(cell: CellState) {
    if (cell.invalid) return "border-red-400 bg-red-50";
    if (cell.givenAway) return "border-transparent bg-red-100";
    if (cell.covering) return "border-transparent bg-blue-100";
    return "border-transparent";
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border border-slate-200 bg-slate-50 p-2 text-left text-xs text-slate-500">
              Staff
            </th>
            <th className="w-16 border border-slate-200 bg-slate-50 p-2"></th>
            {weekDates.map((dateISO) => (
              <th
                key={dateISO}
                className="w-20 border border-slate-200 bg-slate-50 p-2 text-center text-xs text-slate-500"
              >
                {dayLabel(dateISO)}
              </th>
            ))}
            <th className="w-16 border border-slate-200 bg-slate-100 p-2 text-center text-xs text-slate-500">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staffMember) => {
            const lunchCells = grid[staffMember.id]?.lunch ?? emptyRow(weekDates.length);
            const dinnerCells = grid[staffMember.id]?.dinner ?? emptyRow(weekDates.length);
            const dayTotals = weekDates.map(
              (_, i) => cellHours(lunchCells[i], "lunch") + cellHours(dinnerCells[i], "dinner")
            );
            const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

            return (
              <Fragment key={staffMember.id}>
                <tr>
                  <td rowSpan={3} className="border border-slate-200 p-2 align-top font-medium text-slate-900">
                    {staffMember.name}
                    <div className="text-xs font-normal text-slate-500">{staffMember.role}</div>
                  </td>
                  <td className="border border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">LUNCH</td>
                  {lunchCells.map((cell, i) => (
                    <td key={i} className="border border-slate-200 p-1">
                      <input
                        value={cell.text}
                        onChange={(e) => updateCellText(staffMember.id, "lunch", i, e.target.value)}
                        onBlur={() => commitCell(staffMember, "lunch", i)}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        placeholder="OFF"
                        title={
                          cell.givenAway
                            ? cell.sickLeaveApproved
                              ? "Given away, sick pay approved (counts toward total)"
                              : "Given away, covered by someone else"
                            : cell.covering
                              ? "Covering another staff member's shift"
                              : undefined
                        }
                        className={`w-16 rounded border px-1 py-0.5 text-center ${cellClasses(cell)} focus:border-slate-300`}
                      />
                    </td>
                  ))}
                  <td rowSpan={3} className="border border-slate-200 bg-slate-50 p-2 text-center align-middle font-semibold text-slate-800">
                    {weekTotal || ""}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">DINNER</td>
                  {dinnerCells.map((cell, i) => (
                    <td key={i} className="border border-slate-200 p-1">
                      <input
                        value={cell.text}
                        onChange={(e) => updateCellText(staffMember.id, "dinner", i, e.target.value)}
                        onBlur={() => commitCell(staffMember, "dinner", i)}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        placeholder="OFF"
                        title={
                          cell.givenAway
                            ? cell.sickLeaveApproved
                              ? "Given away, sick pay approved (counts toward total)"
                              : "Given away, covered by someone else"
                            : cell.covering
                              ? "Covering another staff member's shift"
                              : undefined
                        }
                        className={`w-16 rounded border px-1 py-0.5 text-center ${cellClasses(cell)} focus:border-slate-300`}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-slate-200 bg-indigo-50 p-2 text-xs font-semibold text-slate-700">
                    TOTAL
                  </td>
                  {dayTotals.map((total, i) => (
                    <td
                      key={i}
                      className="border border-slate-200 bg-indigo-50 p-2 text-center font-semibold text-slate-800"
                    >
                      {total || 0}
                    </td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-100" /> Given away (covered by someone else)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-blue-100" /> Covering another shift
        </span>
      </div>
    </div>
  );
}
