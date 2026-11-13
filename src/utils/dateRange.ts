import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export type StandardPeriodKey =
  | "all"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "this_fy"
  | "last_fy"
  | "custom";

export interface PeriodBounds {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  label: string;
}

/**
 * Returns Calendar Year bounds (Jan 1 00:00:00 to Dec 31 23:59:59.999)
 * for the given reference date + year offset.
 */
export const getCalendarYearBounds = (
  refDate: Date = new Date(),
  offsetYears = 0,
): PeriodBounds => {
  const year = refDate.getFullYear() + offsetYears;
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return {
    start,
    end,
    startStr: format(start, "yyyy-MM-dd"),
    endStr: format(end, "yyyy-MM-dd"),
    label: `${year} (Jan–Dec)`,
  };
};

/**
 * Returns Financial Year bounds (April 1 00:00:00 to March 31 23:59:59.999)
 * for the given reference date + year offset.
 * Example: Nov 2026 -> FY 2026-27 (Apr 1, 2026 to Mar 31, 2027).
 * Example: Feb 2026 -> FY 2025-26 (Apr 1, 2025 to Mar 31, 2026).
 */
export const getFinancialYearBounds = (
  refDate: Date = new Date(),
  offsetYears = 0,
): PeriodBounds => {
  const baseStartYear =
    refDate.getMonth() >= 3
      ? refDate.getFullYear()
      : refDate.getFullYear() - 1;
  const fyStartYear = baseStartYear + offsetYears;
  const fyEndYear = fyStartYear + 1;
  const start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
  const end = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);
  const shortEndYear = String(fyEndYear).slice(-2);
  return {
    start,
    end,
    startStr: format(start, "yyyy-MM-dd"),
    endStr: format(end, "yyyy-MM-dd"),
    label: `FY ${fyStartYear}-${shortEndYear} (Apr–Mar)`,
  };
};

/**
 * Resolves a standard period key into concrete start/end Date objects and yyyy-MM-dd strings.
 */
export const resolveStandardPeriod = (
  period: Exclude<StandardPeriodKey, "all" | "custom">,
  refDate: Date = new Date(),
): PeriodBounds => {
  if (period === "this_month") {
    const start = startOfMonth(refDate);
    const end = endOfMonth(refDate);
    return {
      start,
      end,
      startStr: format(start, "yyyy-MM-dd"),
      endStr: format(end, "yyyy-MM-dd"),
      label: "This Month",
    };
  }
  if (period === "last_month") {
    const prev = subMonths(refDate, 1);
    const start = startOfMonth(prev);
    const end = endOfMonth(prev);
    return {
      start,
      end,
      startStr: format(start, "yyyy-MM-dd"),
      endStr: format(end, "yyyy-MM-dd"),
      label: "Last Month",
    };
  }
  if (period === "this_year") {
    const bounds = getCalendarYearBounds(refDate, 0);
    return { ...bounds, label: `This Year (${bounds.label})` };
  }
  if (period === "last_year") {
    const bounds = getCalendarYearBounds(refDate, -1);
    return { ...bounds, label: `Last Year (${bounds.label})` };
  }
  if (period === "this_fy") {
    const bounds = getFinancialYearBounds(refDate, 0);
    return { ...bounds, label: `This ${bounds.label}` };
  }
  const bounds = getFinancialYearBounds(refDate, -1);
  return { ...bounds, label: `Last ${bounds.label}` };
};
