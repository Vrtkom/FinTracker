import { Account, Transaction, Recurring, FixedCommitmentCategory, FixedCommitmentFrequency } from "../types";
import { getAccountBalance } from "./finance";

export interface MondayOccurrence {
  dateStr: string;
  dayOfMonth: number;
  isPast: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  isPaid: boolean;
  isSkipped: boolean;
  status: "pending" | "paid" | "skipped";
  amount: number;
}

export interface CommitmentMonthStatus {
  commitment: Recurring;
  category: FixedCommitmentCategory;
  frequency: FixedCommitmentFrequency;
  totalExpectedThisMonth: number;
  paidAmount: number;
  pendingAmount: number;
  isFullyPaid: boolean;
  isSkipped: boolean;
  isUpcoming: boolean; // whether scheduled date has not arrived yet
  status: "pending" | "paid" | "skipped";
  occurrencesCount: number; // e.g. 1 for monthly, 4 or 5 for weekly
  paidOccurrencesCount: number;
  pendingOccurrencesCount: number;
  skippedOccurrencesCount: number;
  occurrences: MondayOccurrence[]; // For weekly, details of each Monday
  dueDateDescription: string;
  dueDateFormatted: string;
}

export interface BankSpendableBreakdown {
  account: Account;
  currentBalance: number;
  pendingFixedAmount: number;
  paidFixedAmount: number;
  totalCommittedThisMonth: number;
  remainingToSpend: number;
  commitments: CommitmentMonthStatus[];
}

export interface OverallSpendableSummary {
  totalBankBalance: number;
  totalPendingFixed: number;
  totalPaidFixed: number;
  totalCommittedMonth: number;
  remainingToSpend: number;
  mondaysInMonthCount: number;
  upcomingMondaysCount: number;
  currentMonthName: string;
  currentYear: number;
  accountBreakdowns: BankSpendableBreakdown[];
  allCommitments: CommitmentMonthStatus[];
}

/**
 * Checks whether an account is an actual BANK account (savings/checking/salary/current),
 * strictly excluding Cash, Liquid Cash, Cash in Hand, Petty Cash, or Cash Wallets.
 */
export function isActualBankAccount(account: Account): boolean {
  if (account.type !== "asset" || account.isArchived) return false;
  const name = account.name.toLowerCase().trim();

  // Explicit cash exclusions
  if (
    name === "cash" ||
    name === "liquid cash" ||
    name === "cash in hand" ||
    name === "petty cash" ||
    name === "physical cash" ||
    name === "cash wallet" ||
    name.startsWith("cash ") ||
    name.endsWith(" cash") ||
    (name.includes("cash") && !name.includes("bank"))
  ) {
    return false;
  }

  return true;
}

/**
 * Returns all eligible BANK accounts from the user's Accounts tab,
 * prioritizing accounts with "bank", "checking", "savings", "salary" in the name,
 * and completely excluding pure Cash / Liquid Cash accounts.
 */
export function getEligibleBankAccounts(accounts: Account[]): Account[] {
  const nonCashAssets = accounts.filter(isActualBankAccount);

  // If there are explicit bank accounts (named with "bank", "hdfc", "sbi", etc.), prioritize them
  const explicitBanks = nonCashAssets.filter((a) => {
    const name = a.name.toLowerCase();
    return (
      name.includes("bank") ||
      name.includes("hdfc") ||
      name.includes("sbi") ||
      name.includes("icici") ||
      name.includes("axis") ||
      name.includes("kotak") ||
      name.includes("checking") ||
      name.includes("savings") ||
      name.includes("salary") ||
      name.includes("current")
    );
  });

  if (explicitBanks.length > 0) {
    return explicitBanks;
  }

  // Otherwise return any non-cash asset accounts
  return nonCashAssets;
}

/**
 * Returns all Mondays in the given year and month (0-indexed).
 */
export function getMondaysInMonth(
  year: number,
  month: number
): { dateStr: string; dayOfMonth: number; isPast: boolean; isToday: boolean; isUpcoming: boolean }[] {
  const mondays: { dateStr: string; dayOfMonth: number; isPast: boolean; isToday: boolean; isUpcoming: boolean }[] = [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === 1) {
      // 1 = Monday
      const dayOfMonth = date.getDate();
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isUpcoming = dateStr > todayStr;
      mondays.push({ dateStr, dayOfMonth, isPast, isToday, isUpcoming });
    }
    date.setDate(date.getDate() + 1);
  }
  return mondays;
}

/**
 * Reads manual paid overrides from localStorage.
 */
export function getManualPaidMap(year: number, month: number): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`fintrack_paid_fixed_${year}_${month}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves manual paid status for a commitment or occurrence.
 */
export function setManualPaid(year: number, month: number, key: string, isPaid: boolean) {
  try {
    const current = getManualPaidMap(year, month);
    if (isPaid) {
      current[key] = true;
      // If marking as paid, remove from skipped
      setManualSkipped(year, month, key, false);
    } else {
      delete current[key];
    }
    localStorage.setItem(`fintrack_paid_fixed_${year}_${month}`, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to save manual paid status", err);
  }
}

/**
 * Reads manual skipped (passed) overrides from localStorage.
 */
export function getManualSkippedMap(year: number, month: number): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`fintrack_skipped_fixed_${year}_${month}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves manual skipped (passed) status for a commitment or occurrence.
 * When skipped, it won't be deducted from the bank account balance for that period.
 */
export function setManualSkipped(year: number, month: number, key: string, isSkipped: boolean) {
  try {
    const current = getManualSkippedMap(year, month);
    if (isSkipped) {
      current[key] = true;
      // If marking as skipped, remove manual paid
      const paidMap = getManualPaidMap(year, month);
      delete paidMap[key];
      localStorage.setItem(`fintrack_paid_fixed_${year}_${month}`, JSON.stringify(paidMap));
    } else {
      delete current[key];
    }
    localStorage.setItem(`fintrack_skipped_fixed_${year}_${month}`, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to save manual skipped status", err);
  }
}

/**
 * Evaluates the status of a fixed commitment (Monthly SIP/Rent/Bill or Weekly SIP) for the current month.
 *
 * CRITICAL LOGIC:
 * 1. If date is yet to come (due date > today), keep it PENDING!
 *    Setting deduct and destination account must NOT mark it as cleared if date is in the future.
 * 2. If user skipped / passed on it: status is "skipped" and pendingAmount = 0 (not deducted).
 * 3. Only transactions executed on or after the scheduled due date (or explicitly tagged)
 *    and matching the accounts/amounts can clear it after the date arrives.
 */
export function evaluateCommitmentStatus(
  commitment: Recurring,
  year: number,
  month: number,
  transactions: Transaction[],
  accounts: Account[]
): CommitmentMonthStatus {
  const category: FixedCommitmentCategory = commitment.category || inferCategory(commitment);
  const frequency: FixedCommitmentFrequency =
    commitment.frequency || (commitment.dayOfWeek === 1 ? "weekly" : "monthly");

  const manualPaidMap = getManualPaidMap(year, month);
  const manualSkippedMap = getManualSkippedMap(year, month);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  if (frequency === "weekly") {
    // Weekly SIP triggered on Monday early morning
    const mondays = getMondaysInMonth(year, month);

    const occurrences: MondayOccurrence[] = mondays.map((m) => {
      const occurrenceKey = `${commitment.id}_monday_${m.dateStr}`;
      const isManuallySkipped = !!manualSkippedMap[occurrenceKey];
      const isManuallyPaid = !!manualPaidMap[occurrenceKey];

      let isPaid = false;
      let isSkipped = isManuallySkipped;

      if (isManuallySkipped) {
        return {
          dateStr: m.dateStr,
          dayOfMonth: m.dayOfMonth,
          isPast: m.isPast,
          isToday: m.isToday,
          isUpcoming: m.isUpcoming,
          isPaid: false,
          isSkipped: true,
          status: "skipped",
          amount: commitment.amount,
        };
      }

      if (isManuallyPaid) {
        isPaid = true;
      } else if (m.isUpcoming) {
        // DATE IS YET TO COME: MUST STAY PENDING!
        // Never mark upcoming Monday as cleared automatically, even if accounts are configured!
        isPaid = false;
      } else {
        // Monday is today or in the past: check for an actual transaction
        const matchingTx = transactions.find((t) => {
          if (!t.date.startsWith(monthPrefix)) return false;
          // Transaction must be on or after this Monday, but before next Monday
          if (t.date < m.dateStr) return false;

          const accountsMatch =
            t.creditAccount === commitment.creditAccount &&
            (commitment.debitAccount ? t.debitAccount === commitment.debitAccount : true);

          const isExplicitlyTagged =
            t.tags?.includes("fixed-outflow") &&
            (t.tags?.includes(commitment.id) || t.date === m.dateStr);

          const descMatch =
            commitment.description &&
            (t.description.toLowerCase().includes(commitment.description.toLowerCase()) ||
              commitment.description.toLowerCase().includes(t.description.toLowerCase()));

          return accountsMatch && (isExplicitlyTagged || descMatch);
        });

        isPaid = !!matchingTx;
      }

      const status: "pending" | "paid" | "skipped" = isSkipped
        ? "skipped"
        : isPaid
        ? "paid"
        : "pending";

      return {
        dateStr: m.dateStr,
        dayOfMonth: m.dayOfMonth,
        isPast: m.isPast,
        isToday: m.isToday,
        isUpcoming: m.isUpcoming,
        isPaid,
        isSkipped,
        status,
        amount: commitment.amount,
      };
    });

    const paidOccurrences = occurrences.filter((o) => o.isPaid).length;
    const skippedOccurrences = occurrences.filter((o) => o.isSkipped).length;
    const pendingOccurrences = occurrences.filter((o) => o.status === "pending").length;

    // Total expected this month excluding occurrences the user decided to pass on
    const activeOccurrencesCount = occurrences.length - skippedOccurrences;
    const totalExpectedThisMonth = occurrences.length * commitment.amount;
    const paidAmount = paidOccurrences * commitment.amount;
    const pendingAmount = pendingOccurrences * commitment.amount;

    const isFullyPaid = occurrences.length > 0 && pendingOccurrences === 0 && paidOccurrences > 0;
    const allSkipped = skippedOccurrences === occurrences.length;

    const overallStatus: "pending" | "paid" | "skipped" = allSkipped
      ? "skipped"
      : pendingOccurrences === 0
      ? "paid"
      : "pending";

    // Next upcoming Monday info
    const nextUpcoming = occurrences.find((o) => o.status === "pending");
    const nextUpcomingDateStr = nextUpcoming ? `Next: Mon ${nextUpcoming.dayOfMonth}th` : "All cleared/passed";

    return {
      commitment,
      category,
      frequency,
      totalExpectedThisMonth,
      paidAmount,
      pendingAmount,
      isFullyPaid,
      isSkipped: allSkipped,
      isUpcoming: nextUpcoming !== undefined,
      status: overallStatus,
      occurrencesCount: occurrences.length,
      paidOccurrencesCount: paidOccurrences,
      pendingOccurrencesCount: pendingOccurrences,
      skippedOccurrencesCount: skippedOccurrences,
      occurrences,
      dueDateDescription: `Every Monday (${occurrences.length} Mondays this month: ₹${totalExpectedThisMonth.toLocaleString("en-IN")})`,
      dueDateFormatted: nextUpcomingDateStr,
    };
  } else {
    // Monthly Fixed Commitment (Rent, Bill, Monthly SIP)
    const occurrenceKey = `${commitment.id}_month`;
    const isManuallySkipped = !!manualSkippedMap[occurrenceKey];
    const isManuallyPaid = !!manualPaidMap[occurrenceKey];

    const day = commitment.day || 1;
    const dueDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isUpcoming = dueDateStr > todayStr;
    const isToday = dueDateStr === todayStr;
    const isPast = dueDateStr < todayStr;

    let isPaid = false;
    let isSkipped = isManuallySkipped;

    if (isManuallySkipped) {
      isSkipped = true;
      isPaid = false;
    } else if (isManuallyPaid) {
      isPaid = true;
    } else if (isUpcoming) {
      // CRITICAL REQUIREMENT:
      // "if date is yet to come , keep it pending, if i put deduct and destination account and still date is yet to come , it marked as cleared fix this"
      // MUST REMAIN PENDING! Unrelated past transactions before the due date cannot clear an upcoming bill/SIP/rent!
      isPaid = false;
    } else {
      // Due date has arrived (isToday or isPast): check if an actual payment was made on or after the scheduled date
      const matchingTx = transactions.find((t) => {
        if (!t.date.startsWith(monthPrefix)) return false;
        // Transaction must have occurred ON OR AFTER the due date (or at most 2 days before for bank holiday/weekend processing)
        const txDate = t.date;
        const minDate = new Date(year, month, Math.max(1, day - 2))
          .toISOString()
          .split("T")[0];
        if (txDate < minDate) return false;

        const creditMatch = t.creditAccount === commitment.creditAccount;
        const debitMatch = commitment.debitAccount ? t.debitAccount === commitment.debitAccount : true;

        const isTagged = t.tags?.includes("fixed-outflow") && t.tags?.includes(commitment.id);
        const descMatch =
          commitment.description &&
          (t.description.toLowerCase().includes(commitment.description.toLowerCase()) ||
            commitment.description.toLowerCase().includes(t.description.toLowerCase()));

        // Also check if amount matches closely
        const amountMatch = Math.abs(t.amount - commitment.amount) < 1;

        return creditMatch && debitMatch && (isTagged || (descMatch && amountMatch));
      });

      isPaid = !!matchingTx;
    }

    const totalExpectedThisMonth = commitment.amount;
    const paidAmount = isPaid ? commitment.amount : 0;
    // If skipped: pendingAmount is 0 (NOT deducted from bank balance)!
    // If paid: pendingAmount is 0
    // If pending: pendingAmount is commitment.amount
    const pendingAmount = isSkipped || isPaid ? 0 : commitment.amount;

    const status: "pending" | "paid" | "skipped" = isSkipped
      ? "skipped"
      : isPaid
      ? "paid"
      : "pending";

    const occurrence: MondayOccurrence = {
      dateStr: dueDateStr,
      dayOfMonth: day,
      isPast,
      isToday,
      isUpcoming,
      isPaid,
      isSkipped,
      status,
      amount: commitment.amount,
    };

    const ordinal = getOrdinalSuffix(day);
    const dueDateFormatted = `${day}${ordinal} of ${now.toLocaleString("default", { month: "short" })}`;

    return {
      commitment,
      category,
      frequency: "monthly",
      totalExpectedThisMonth,
      paidAmount,
      pendingAmount,
      isFullyPaid: isPaid,
      isSkipped,
      isUpcoming,
      status,
      occurrencesCount: 1,
      paidOccurrencesCount: isPaid ? 1 : 0,
      pendingOccurrencesCount: isPaid || isSkipped ? 0 : 1,
      skippedOccurrencesCount: isSkipped ? 1 : 0,
      occurrences: [occurrence],
      dueDateDescription: `${day}${ordinal} of every month`,
      dueDateFormatted,
    };
  }
}

/**
 * Calculates spendable balances across actual BANK accounts from the Accounts tab.
 * Strictly excludes Cash and Liquid Cash accounts.
 */
export function calculateSpendableSummary(
  accounts: Account[],
  recurring: Recurring[],
  transactions: Transaction[]
): OverallSpendableSummary {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString("default", { month: "long" });

  const mondays = getMondaysInMonth(year, month);
  const upcomingMondays = mondays.filter((m) => !m.isPast);

  // Take the real BANK accounts from the Accounts tab, never liquid cash
  const bankAccounts = getEligibleBankAccounts(accounts);

  const allEvaluated = recurring.map((r) =>
    evaluateCommitmentStatus(r, year, month, transactions, accounts)
  );

  const accountBreakdowns: BankSpendableBreakdown[] = bankAccounts.map((account) => {
    const currentBalance = getAccountBalance(account.id, accounts, transactions);
    const commitmentsForAccount = allEvaluated.filter(
      (c) => c.commitment.creditAccount === account.id
    );

    const pendingFixedAmount = commitmentsForAccount.reduce(
      (sum, c) => sum + c.pendingAmount,
      0
    );
    const paidFixedAmount = commitmentsForAccount.reduce(
      (sum, c) => sum + c.paidAmount,
      0
    );
    const totalCommittedThisMonth = commitmentsForAccount.reduce(
      (sum, c) => sum + c.totalExpectedThisMonth,
      0
    );

    // Remaining money to spend in this bank account after pending fixed commitments
    const remainingToSpend = currentBalance - pendingFixedAmount;

    return {
      account,
      currentBalance,
      pendingFixedAmount,
      paidFixedAmount,
      totalCommittedThisMonth,
      remainingToSpend,
      commitments: commitmentsForAccount,
    };
  });

  const totalBankBalance = accountBreakdowns.reduce((sum, b) => sum + b.currentBalance, 0);
  const totalPendingFixed = allEvaluated.reduce((sum, c) => sum + c.pendingAmount, 0);
  const totalPaidFixed = allEvaluated.reduce((sum, c) => sum + c.paidAmount, 0);
  const totalCommittedMonth = allEvaluated.reduce((sum, c) => sum + c.totalExpectedThisMonth, 0);
  const remainingToSpend = totalBankBalance - totalPendingFixed;

  return {
    totalBankBalance,
    totalPendingFixed,
    totalPaidFixed,
    totalCommittedMonth,
    remainingToSpend,
    mondaysInMonthCount: mondays.length,
    upcomingMondaysCount: upcomingMondays.length,
    currentMonthName: monthName,
    currentYear: year,
    accountBreakdowns,
    allCommitments: allEvaluated,
  };
}

/**
 * Infer category from description if not explicitly set.
 */
function inferCategory(r: Recurring): FixedCommitmentCategory {
  const text = (r.description || "").toLowerCase();
  if (
    text.includes("sip") ||
    text.includes("mutual") ||
    text.includes("invest") ||
    text.includes("fund") ||
    text.includes("nippon") ||
    text.includes("equity")
  ) {
    return "sip";
  }
  if (
    text.includes("rent") ||
    text.includes("house") ||
    text.includes("flat") ||
    text.includes("maintenance") ||
    text.includes("landlord")
  ) {
    return "rent";
  }
  if (
    text.includes("bill") ||
    text.includes("wifi") ||
    text.includes("broadband") ||
    text.includes("electricity") ||
    text.includes("mobile") ||
    text.includes("water") ||
    text.includes("gas") ||
    text.includes("sub") ||
    text.includes("netflix") ||
    text.includes("recharge")
  ) {
    return "bill";
  }
  return "other";
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
