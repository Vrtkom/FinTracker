import React, { useMemo, useState } from "react";
import { ArrowLeft, Edit2, Calendar } from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import {
  formatCurrency,
  getAccountBalance,
  getAccountColor,
} from "../utils/finance";
import { Account } from "../types";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { resolveStandardPeriod, StandardPeriodKey } from "../utils/dateRange";

export type AccountDateRange = StandardPeriodKey;

export const AccountDetails = ({
  accountId,
  onBack,
  onEdit,
  initialDateRange = "all",
  initialCustomStart = "",
  initialCustomEnd = "",
}: {
  accountId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  initialDateRange?: AccountDateRange;
  initialCustomStart?: string;
  initialCustomEnd?: string;
}) => {
  const { accounts, transactions } = useFinance();
  const account = accounts.find((a) => a.id === accountId);

  const [dateRange, setDateRange] =
    useState<AccountDateRange>(initialDateRange);
  const [customStart, setCustomStart] = useState(initialCustomStart);
  const [customEnd, setCustomEnd] = useState(initialCustomEnd);

  const { startDate, endDate, rangeLabel } = useMemo(() => {
    if (dateRange === "custom") {
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
        rangeLabel: customStart && customEnd ? `${customStart} to ${customEnd}` : "Custom Range",
      };
    }
    if (dateRange === "all") {
      return { startDate: undefined, endDate: undefined, rangeLabel: "Overall (All Time)" };
    }
    const resolved = resolveStandardPeriod(dateRange);
    return {
      startDate: resolved.startStr,
      endDate: resolved.endStr,
      rangeLabel: resolved.label,
    };
  }, [dateRange, customStart, customEnd]);

  const allAccountTxs = useMemo(() => {
    return transactions
      .filter(
        (t) => t.debitAccount === accountId || t.creditAccount === accountId,
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, accountId]);

  const filteredAccountTxs = useMemo(() => {
    return allAccountTxs.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [allAccountTxs, startDate, endDate]);

  const isPeriodFiltered = dateRange !== "all";

  // Balance for current filtered range
  const periodBalance = account
    ? getAccountBalance(
        account.id,
        accounts,
        transactions,
        false,
        false,
        startDate,
        endDate,
      )
    : 0;

  // Overall all-time balance (as-of-today)
  const overallBalance = account
    ? getAccountBalance(account.id, accounts, transactions)
    : 0;

  const sparklineData = useMemo(() => {
    if (!account) return [];
    let currentBal = isPeriodFiltered ? periodBalance : overallBalance;
    const txsToUse = isPeriodFiltered ? filteredAccountTxs : allAccountTxs;
    const data = [{ date: "End", balance: currentBal }];

    // Go backwards in time to build the sparkline
    for (const tx of txsToUse) {
      if (tx.debitAccount === account.id) {
        currentBal -= tx.amount;
      } else if (tx.creditAccount === account.id) {
        currentBal += tx.amount;
      }
      data.unshift({ date: tx.date, balance: currentBal });
    }
    return data;
  }, [
    account,
    isPeriodFiltered,
    periodBalance,
    overallBalance,
    filteredAccountTxs,
    allAccountTxs,
  ]);

  if (!account) return <div>Account not found</div>;

  const accColor = getAccountColor(account.type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-gray-300" />
          </button>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            {account.name}
            <button
              onClick={() => onEdit(account.id)}
              className="p-1.5 bg-slate-100 dark:bg-gray-800 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
              title="Edit Account"
            >
              <Edit2 className="w-4 h-4 text-slate-500 dark:text-gray-400" />
            </button>
          </h2>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as AccountDateRange)}
              aria-label="Filter account by time period"
              className="bg-transparent border-none text-xs md:text-sm font-semibold text-slate-700 dark:text-gray-200 focus:ring-0 cursor-pointer py-1 pr-6"
            >
              <option value="all">Overall (All Time)</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year (Jan–Dec)</option>
              <option value="this_fy">This Financial Year (Apr–Mar)</option>
              <option value="last_year">Last Year (Jan–Dec)</option>
              <option value="last_fy">Last Financial Year (Apr–Mar)</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-1.5 px-2 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-gray-700 pt-2 sm:pt-0">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                aria-label="Custom range start date"
                className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-slate-700 dark:text-gray-300"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                aria-label="Custom range end date"
                className="text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-slate-700 dark:text-gray-300"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {isPeriodFiltered ? `${rangeLabel} Balance` : "Current Balance"}
              </p>
              {isPeriodFiltered && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  Filtered
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {formatCurrency(isPeriodFiltered ? periodBalance : overallBalance)}
            </p>
            {isPeriodFiltered && (
              <p className="text-xs text-slate-500 dark:text-gray-400 mb-6">
                Overall: <span className="font-semibold text-slate-700 dark:text-gray-300">{formatCurrency(overallBalance)}</span>
              </p>
            )}
            {!isPeriodFiltered && <div className="mb-4"></div>}

            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <YAxis domain={["dataMin", "dataMax"]} hide />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke={accColor}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {account.type === "liability" && account.creditLimit && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-gray-800">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                    Credit Utilization
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {Math.round((overallBalance / account.creditLimit) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${overallBalance / account.creditLimit > 0.8 ? "bg-red-500" : "bg-blue-500"}`}
                    style={{
                      width: `${Math.min(100, (overallBalance / account.creditLimit) * 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 text-right">
                  {formatCurrency(account.creditLimit)} Limit
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Transactions ({filteredAccountTxs.length})
              </h3>
              {isPeriodFiltered && (
                <span className="text-xs text-slate-500 dark:text-gray-400">
                  Showing {rangeLabel}
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredAccountTxs.length > 0 ? (
                filteredAccountTxs.map((t) => {
                  const isDebit = t.debitAccount === account.id;
                  const amountColor = isDebit
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-900 dark:text-white";
                  const prefix = isDebit ? "+" : "-";

                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-4 p-3 rounded-xl border bg-white border-slate-100 dark:bg-gray-900 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 transition-colors"
                    >
                      <div className="flex-1 truncate">
                        <p className="font-medium truncate text-slate-800 dark:text-gray-200">
                          {t.description}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          {t.date}
                        </p>
                      </div>
                      <span className={`font-bold ${amountColor} shrink-0`}>
                        {prefix}
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-slate-500 dark:text-gray-400 py-8 text-sm">
                  No transactions found for this period.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
