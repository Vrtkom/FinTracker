import React, { useMemo, useState } from "react";
import {
  Coffee,
  Coins,
  Lock,
  CreditCard,
  Wallet,
  CalendarDays,
  Activity,
  Trophy,
  Repeat,
  Paperclip,
  X,
  TrendingUp,
  Settings,
  Sparkles,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import {
  formatCurrency,
  getTotals,
  getAverages,
  getGamificationStreaks,
  getAccountBalance,
  getNetWorthChartData,
} from "../utils/finance";
import { calculateSpendableSummary, getEligibleBankAccounts } from "../utils/fixedCommitments";
import { TransactionSlideOver } from "../components/TransactionSlideOver";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Dashboard = ({
  switchTab,
}: {
  switchTab: (tab: string) => void;
}) => {
  const {
    accounts,
    transactions,
    recurring,
    goals,
    hideBalances,
    setHideBalances,
    setJournalFilterAccount,
    setJournalFilterSearch,
    setJournalFilterDate,
    funds,
    spendableAccounts,
    setSpendableAccounts,
    portfolioItems,
    reverseBudgetConfig,
  } = useFinance();
  const [slideOverTxId, setSlideOverTxId] = useState<string | null>(null);
  const [showSpendableSettings, setShowSpendableSettings] = useState(false);

  const totals = useMemo(
    () => getTotals(accounts, transactions, portfolioItems),
    [accounts, transactions, portfolioItems],
  );
  const avgs = useMemo(
    () => getAverages(accounts, transactions),
    [accounts, transactions],
  );
  const streaks = useMemo(
    () => getGamificationStreaks(accounts, transactions),
    [accounts, transactions],
  );
  const netWorthData = useMemo(
    () => getNetWorthChartData(accounts, transactions),
    [accounts, transactions],
  );

  const runwayMonths =
    avgs.avgNeeds > 0 ? (totals.liquidAssets / avgs.avgNeeds).toFixed(1) : "∞";
  const todayStr = new Date().toISOString().split("T")[0];
  const recentTxs = [...transactions].slice(-4).reverse();

  const blurClass = hideBalances
    ? "blur-[6px] opacity-50 select-none cursor-pointer"
    : "cursor-pointer transition-all duration-300";
  const toggleHideBalances = () => setHideBalances(!hideBalances);

  const [selectedDay, setSelectedDay] = useState<any>(null);

  const totalSpendable = useMemo(() => {
    const eligibleBanks = getEligibleBankAccounts(accounts);
    const spendableAccs =
      spendableAccounts.length > 0
        ? accounts.filter((a) => spendableAccounts.includes(a.id))
        : eligibleBanks;
    const totalBank = spendableAccs.reduce(
      (sum, a) => sum + getAccountBalance(a.id, accounts, transactions),
      0,
    );
    const totalFunds = funds.reduce((sum, f) => sum + f.balance, 0);
    return totalBank - totalFunds;
  }, [accounts, transactions, spendableAccounts, funds]);

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  let curIncome = 0;
  let curExpenses = 0;
  const expMap: Record<string, number> = {};
  const accSpent: Record<string, number> = {};

  transactions.forEach((t) => {
    if (t.date > todayStr) return;
    const d = new Date(t.date);
    if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
      const crAcc = accounts.find((a) => a.id === t.creditAccount);
      if (crAcc && crAcc.type === "income") curIncome += t.amount;

      const drAcc = accounts.find((a) => a.id === t.debitAccount);
      if (drAcc && drAcc.type === "expense") {
        expMap[drAcc.name] = (expMap[drAcc.name] || 0) + t.amount;
        accSpent[drAcc.id] = (accSpent[drAcc.id] || 0) + t.amount;
        curExpenses += t.amount;
      }
    }
  });

  let recurringIncomeTotal = 0;
  let recurringExpenseTotal = 0;

  recurring.forEach((r) => {
    const crAcc = accounts.find((a) => a.id === r.creditAccount);
    if (crAcc && crAcc.type === "income") recurringIncomeTotal += r.amount;
    else recurringExpenseTotal += r.amount;
  });

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const todayDate = now.getDate();
  const daysLeft = daysInMonth - todayDate + 1;

  let totalBudget = 0;
  let spentInBudgets = 0;
  accounts.forEach((a) => {
    if (a.type === "expense" && (a.budget || 0) > 0) {
      totalBudget += a.budget || 0;
      spentInBudgets += accSpent[a.id] || 0;
    }
  });

  // Fixed Commitments & Remaining to Spend calculation
  const spendableSummary = calculateSpendableSummary(accounts, recurring, transactions);
  const safeToSpend = Math.max(0, spendableSummary.remainingToSpend / daysLeft);

  const allowanceText = (
    <div>
      <div className="flex items-center justify-center md:justify-end gap-1.5 font-bold text-emerald-200">
        <Sparkles className="w-3.5 h-3.5" /> Remaining to Spend (Safe Cash)
      </div>
      <p className="mt-0.5 opacity-90 text-[11px] md:text-xs">
        {formatCurrency(spendableSummary.remainingToSpend)} safe after -{formatCurrency(spendableSummary.totalPendingFixed)} pending fixed SIPs, rent & bills.
      </p>
      <button
        onClick={() => switchTab("accounts")}
        className="text-[11px] underline font-semibold text-white/90 hover:text-white mt-1 inline-block"
      >
        View Bank Accounts Breakdown →
      </button>
    </div>
  );

  const calendarDays = [];
  let runningBalance = totals.liquidAssets; // Start with current liquid assets

  for (let offset = 0; offset < 30; offset++) {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
    );
    const dayOfMonth = d.getDate();
    const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
    const isToday = offset === 0;

    // Create local date string YYYY-MM-DD
    const dateString = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];

    // Find recurring bills for this day of the month
    const monthStr = dateString.slice(0, 7);
    const recurringBills = recurring
      .filter((r) => {
        if ((r.day || 1) !== dayOfMonth) return false;
        // Check if this recurring bill was already posted in the month of 'd'
        const alreadyPosted = transactions.some(
          (t) => t.date.startsWith(monthStr) && t.description === r.description,
        );
        return !alreadyPosted;
      })
      .map((r) => ({ ...r, isRecurring: true }));

    // Find one-off transactions for this specific date
    const oneOffTxs = transactions
      .filter((t) => t.date === dateString)
      .map((t) => ({ ...t, isRecurring: false }));

    // Combine them
    const dayBills = [...recurringBills, ...oneOffTxs];

    // Calculate projected change for the day
    let dayNetChange = 0;
    dayBills.forEach((b) => {
      const drAcc = accounts.find((a) => a.id === b.debitAccount);
      const crAcc = accounts.find((a) => a.id === b.creditAccount);

      const drIsLiquid =
        drAcc && drAcc.type === "asset" && drAcc.liquidity !== "invested";
      const crIsLiquid =
        crAcc && crAcc.type === "asset" && crAcc.liquidity !== "invested";

      if (drIsLiquid && !crIsLiquid) {
        dayNetChange += b.amount;
      } else if (!drIsLiquid && crIsLiquid) {
        dayNetChange -= b.amount;
      }
    });

    // If it's today, we don't add the net change to the running balance yet because today's actual transactions are already in totals.liquidAssets.
    // Wait, future one-offs for today might not be cleared, but let's just project from tomorrow onwards for simplicity, or project from today's end.
    // Let's just add the net change to running balance for visualization.
    if (!isToday) {
      runningBalance += dayNetChange;
    }

    calendarDays.push({
      i: offset,
      date: d,
      dayOfMonth,
      dayOfWeek,
      isToday,
      dayBills,
      dateString,
      projectedBalance: runningBalance,
      netChange: dayNetChange,
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
        Dashboard
      </h2>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 md:p-6 mb-6 text-white shadow-lg shadow-blue-500/30 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full md:w-auto">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <Coffee className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-xs md:text-sm font-medium uppercase tracking-widest mb-0.5">
                Safe to spend today
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl md:text-4xl font-black">
                  {formatCurrency(safeToSpend)}
                </p>
                <p className="text-blue-100 text-xs md:text-sm pb-1">
                  / {daysLeft} days left
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-white/20"></div>

          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <Wallet className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-blue-100 text-xs md:text-sm font-medium uppercase tracking-widest">
                  Total Spendable
                </p>
                <button
                  onClick={() => setShowSpendableSettings(true)}
                  className="text-blue-200 hover:text-white transition-colors"
                  title="Customize Spendable Accounts"
                >
                  <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <p
                  className={`text-3xl md:text-4xl font-black ${blurClass}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHideBalances();
                  }}
                >
                  {formatCurrency(totalSpendable)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-xl text-xs md:text-sm border border-white/20 backdrop-blur-sm text-center md:text-right w-full md:max-w-xs">
          {allowanceText}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div
          className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col gap-1 shadow-sm dark:shadow-blue-900/10 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          onClick={() => switchTab("accounts")}
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Coins className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">
              Liquid Cash
            </span>
          </div>
          <p
            className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleHideBalances();
            }}
            title="Click to show/hide balance"
          >
            {formatCurrency(totals.liquidAssets)}
          </p>
          <p
            className={`text-[10px] md:text-xs text-slate-500 dark:text-gray-400 mt-1 truncate ${blurClass}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleHideBalances();
            }}
          >
            ≈ {runwayMonths} months runway
          </p>
        </div>
        <div
          className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-gray-800 flex flex-col gap-1 md:gap-2 shadow-sm cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          onClick={() => switchTab("accounts")}
        >
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Lock className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">
              Locked
            </span>
          </div>
          <p
            className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleHideBalances();
            }}
            title="Click to show/hide balance"
          >
            {formatCurrency(totals.lockedAssets)}
          </p>
        </div>
        <div
          className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-gray-800 flex flex-col gap-1 md:gap-2 shadow-sm cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors"
          onClick={() => switchTab("accounts")}
        >
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">
              Liabilities
            </span>
          </div>
          <p
            className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleHideBalances();
            }}
            title="Click to show/hide balance"
          >
            {formatCurrency(totals.liabilities)}
          </p>
        </div>
        <div
          className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 flex flex-col gap-1 md:gap-2 shadow-sm dark:shadow-emerald-900/10 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          onClick={() => switchTab("accounts")}
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">
              Net Worth
            </span>
          </div>
          <p
            className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleHideBalances();
            }}
            title="Click to show/hide balance"
          >
            {formatCurrency(totals.netWorth)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm mt-2 md:mt-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" /> Net Worth Trend
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={netWorthData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
                className="dark:stroke-gray-800"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-gray-700">
                        <p className="font-bold text-slate-900 dark:text-white mb-1">
                          {data.name}
                        </p>
                        <p
                          className={`text-lg font-black ${hideBalances ? "blur-sm" : ""} text-emerald-600 dark:text-emerald-400`}
                        >
                          {formatCurrency(data.netWorth)}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-gray-700 space-y-1">
                          <p className="text-xs text-slate-500 dark:text-gray-400 flex justify-between gap-4">
                            <span>Change:</span>
                            <span
                              className={`font-bold ${data.change >= 0 ? "text-emerald-500" : "text-red-500"}`}
                            >
                              {data.change >= 0 ? "+" : ""}
                              {formatCurrency(data.change)}
                            </span>
                          </p>
                          {data.topPositive.amount > 0 && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 flex justify-between gap-4">
                              <span className="truncate max-w-[100px]">
                                Top (+): {data.topPositive.name}
                              </span>
                              <span className="text-emerald-500">
                                +{formatCurrency(data.topPositive.amount)}
                              </span>
                            </p>
                          )}
                          {data.topNegative.amount < 0 && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 flex justify-between gap-4">
                              <span className="truncate max-w-[100px]">
                                Top (-): {data.topNegative.name}
                              </span>
                              <span className="text-red-500">
                                {formatCurrency(data.topNegative.amount)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorNetWorth)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm mt-2 md:mt-6 overflow-hidden">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-500" /> 30-Day Forecast
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x no-scrollbar">
          {calendarDays.map((day) => (
            <div
              key={day.i}
              onClick={() => setSelectedDay(day)}
              className={`min-w-[80px] shrink-0 p-2.5 rounded-2xl border cursor-pointer transition-all hover:scale-105 ${day.isToday ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm" : "bg-white border-slate-100 dark:bg-gray-800/50 dark:border-gray-700/50"} ${day.projectedBalance < 0 ? "border-red-300 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10" : ""} flex flex-col items-center snap-start`}
            >
              <span
                className={`text-[9px] uppercase font-bold tracking-wider ${day.isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-gray-500"}`}
              >
                {day.dayOfWeek}
              </span>
              <span
                className={`text-xl font-black ${day.isToday ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-gray-200"}`}
              >
                {day.dayOfMonth}
              </span>
              <div className="w-full flex flex-col gap-1 mt-2 min-h-[16px] justify-end">
                {day.dayBills.length > 0 ? (
                  day.dayBills.slice(0, 3).map((b: any, idx: number) => {
                    const drAcc = accounts.find((a) => a.id === b.debitAccount);
                    const crAcc = accounts.find(
                      (a) => a.id === b.creditAccount,
                    );
                    const drIsLiquid =
                      drAcc &&
                      drAcc.type === "asset" &&
                      drAcc.liquidity !== "invested";
                    const crIsLiquid =
                      crAcc &&
                      crAcc.type === "asset" &&
                      crAcc.liquidity !== "invested";

                    let isPositive = false;
                    let isNeutral = false;
                    if (drIsLiquid && !crIsLiquid) isPositive = true;
                    else if (drIsLiquid && crIsLiquid) isNeutral = true;
                    else if (!drIsLiquid && !crIsLiquid) isNeutral = true;

                    const colorClass = isNeutral
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                      : isPositive
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
                    const prefix = isNeutral ? "" : isPositive ? "+" : "-";
                    return (
                      <div
                        key={idx}
                        className={`text-[9px] ${colorClass} px-1 py-0.5 rounded truncate w-full text-center font-medium`}
                        title={b.description}
                      >
                        {prefix}
                        {formatCurrency(b.amount)}
                      </div>
                    );
                  })
                ) : (
                  <div className="h-1 w-1 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto opacity-50"></div>
                )}
                {day.dayBills.length > 3 && (
                  <div className="text-[9px] text-slate-400 text-center">
                    +{day.dayBills.length - 3} more
                  </div>
                )}
              </div>
              <div
                className={`mt-2 pt-2 border-t w-full text-center text-[9px] font-bold ${day.projectedBalance < 0 ? "text-red-500 border-red-200 dark:border-red-800/50" : "text-slate-500 border-slate-100 dark:border-gray-700/50 dark:text-gray-400"} ${blurClass}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleHideBalances();
                }}
              >
                {formatCurrency(day.projectedBalance)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                {selectedDay.date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between mb-6 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50">
                <div>
                  <p className="text-[10px] uppercase text-slate-500 dark:text-gray-400 font-bold mb-1">
                    Net Change
                  </p>
                  <p
                    className={`font-black ${selectedDay.netChange >= 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {selectedDay.netChange >= 0 ? "+" : ""}
                    {formatCurrency(selectedDay.netChange)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-500 dark:text-gray-400 font-bold mb-1">
                    Proj. Balance
                  </p>
                  <p
                    className={`font-black ${blurClass} ${selectedDay.projectedBalance < 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}
                    onClick={toggleHideBalances}
                  >
                    {formatCurrency(selectedDay.projectedBalance)}
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-3 uppercase tracking-wider">
                Scheduled Events
              </h3>
              {selectedDay.dayBills.length > 0 ? (
                <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                  {selectedDay.dayBills.map((b: any, idx: number) => {
                    const drAcc = accounts.find((a) => a.id === b.debitAccount);
                    const crAcc = accounts.find(
                      (a) => a.id === b.creditAccount,
                    );
                    const drIsLiquid =
                      drAcc &&
                      drAcc.type === "asset" &&
                      drAcc.liquidity !== "invested";
                    const crIsLiquid =
                      crAcc &&
                      crAcc.type === "asset" &&
                      crAcc.liquidity !== "invested";

                    let isPositive = false;
                    let isNeutral = false;
                    if (drIsLiquid && !crIsLiquid) isPositive = true;
                    else if (drIsLiquid && crIsLiquid) isNeutral = true;
                    else if (!drIsLiquid && !crIsLiquid) isNeutral = true;

                    const amountColor = isNeutral
                      ? "text-slate-500 dark:text-slate-400"
                      : isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-900 dark:text-white";
                    const prefix = isNeutral ? "" : isPositive ? "+" : "-";
                    return (
                      <li
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-700/50 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-gray-200 text-sm">
                            {b.description}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider">
                            {b.isRecurring ? "Recurring" : "One-off"}
                          </p>
                        </div>
                        <span className={`font-bold ${amountColor}`}>
                          {prefix}
                          {formatCurrency(b.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-center text-slate-500 dark:text-gray-400 py-8 text-sm">
                  No events scheduled for this day.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2 md:mt-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Recent Entries
              </h3>
              <button
                onClick={() => {
                  setJournalFilterAccount("");
                  setJournalFilterSearch("");
                  setJournalFilterDate("all");
                  switchTab("transactions");
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentTxs.length > 0 ? (
                recentTxs.map((t) => {
                  const drAcc =
                    accounts.find((a) => a.id === t.debitAccount)?.name ||
                    "Unknown";
                  const isFuture = t.date > todayStr;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSlideOverTxId(t.id)}
                      className="flex justify-between items-center p-3.5 md:p-4 bg-slate-50 hover:bg-slate-100 dark:bg-gray-850 dark:hover:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-800 transition-colors cursor-pointer"
                    >
                      <div className="truncate pr-4 flex-1">
                        <p className="font-medium text-slate-800 dark:text-gray-200 truncate flex items-center gap-2">
                          {t.description}
                          {t.receipt && (
                            <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                          {isFuture && (
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                              Pending
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] md:text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">
                          {t.date} &bull; {drAcc}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-gray-100 shrink-0">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 dark:text-gray-500 text-sm text-center py-6 bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-slate-200 dark:border-gray-800 border-dashed">
                  No entries yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Habits & Streaks
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/50">
                <div className="text-3xl">🔥</div>
                <div>
                  <p className="font-bold text-orange-600 dark:text-orange-400 text-lg">
                    {streaks.loggingStreak} Days
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Logging Streak
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-3xl">🎯</div>
                <div>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                    {streaks.savingsStreak} Months
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    20%+ Savings Rate Streak
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Repeat className="w-5 h-5 text-blue-500" /> Recurring Flows
              </h3>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Income
                </p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(recurringIncomeTotal)}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Expenses
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  -{formatCurrency(recurringExpenseTotal)}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50 max-h-48 overflow-y-auto">
              {recurring.length > 0 ? (
                recurring.map((r, idx) => {
                  const crAcc = accounts.find((a) => a.id === r.creditAccount);
                  const isIncome = crAcc && crAcc.type === "income";
                  const amountColor = isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-800 dark:text-white";
                  const prefix = isIncome ? "+" : "-";
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-gray-800/50 last:border-0"
                    >
                      <span className="text-sm font-medium text-slate-600 dark:text-gray-300 truncate pr-2">
                        {r.description}
                      </span>
                      <span
                        className={`font-bold ${amountColor} text-sm shrink-0`}
                      >
                        {prefix}
                        {formatCurrency(r.amount)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 dark:text-gray-500 italic py-2">
                  No recurring templates saved.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <TransactionSlideOver
        isOpen={!!slideOverTxId}
        onClose={() => setSlideOverTxId(null)}
        transactionId={slideOverTxId}
      />

      {showSpendableSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Spendable Accounts
              </h2>
              <button
                onClick={() => setShowSpendableSettings(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
              Select which accounts should be included in your "Total Spendable"
              calculation. Your allocated funds will be subtracted from the
              total balance of these accounts.
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-6 pr-2">
              {accounts
                .filter((a) => a.type === "asset")
                .map((acc) => (
                  <label
                    key={acc.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={spendableAccounts.includes(acc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSpendableAccounts([...spendableAccounts, acc.id]);
                        } else {
                          setSpendableAccounts(
                            spendableAccounts.filter((id) => id !== acc.id),
                          );
                        }
                      }}
                    />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-gray-200">
                        {acc.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {formatCurrency(
                          getAccountBalance(acc.id, accounts, transactions),
                        )}
                      </p>
                    </div>
                  </label>
                ))}
            </div>

            <button
              onClick={() => setShowSpendableSettings(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
