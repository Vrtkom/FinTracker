import React, { useMemo, useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency } from "../utils/finance";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { SpendingHeatmap } from "../components/SpendingHeatmap";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from "date-fns";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export const Insights = ({
  switchTab,
}: {
  switchTab: (tab: string) => void;
}) => {
  const {
    accounts,
    transactions,
    setJournalFilterAccount,
    setJournalFilterSearch,
    setJournalFilterDate,
  } = useFinance();

  const [dateRange, setDateRange] = useState<
    "this_month" | "last_month" | "this_year" | "custom"
  >("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const {
    expenseData,
    incomeVsExpenseData,
    topExpenses,
    currentPeriodMetrics,
    previousPeriodMetrics,
    unusualSpending,
  } = useMemo(() => {
    const now = new Date();
    let startDate: Date, endDate: Date;
    let prevStartDate: Date, prevEndDate: Date;

    if (dateRange === "this_month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      prevStartDate = startOfMonth(subMonths(now, 1));
      prevEndDate = endOfMonth(subMonths(now, 1));
    } else if (dateRange === "last_month") {
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      prevStartDate = startOfMonth(subMonths(now, 2));
      prevEndDate = endOfMonth(subMonths(now, 2));
    } else if (dateRange === "this_year") {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      prevStartDate = startOfYear(subMonths(now, 12));
      prevEndDate = endOfYear(subMonths(now, 12));
    } else {
      startDate = customStart ? new Date(customStart) : startOfMonth(now);
      endDate = customEnd ? new Date(customEnd) : endOfMonth(now);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      prevStartDate = new Date(startDate.getTime() - diffTime);
      prevEndDate = new Date(endDate.getTime() - diffTime);
    }

    const getMetricsForPeriod = (start: Date, end: Date) => {
      let income = 0;
      let expense = 0;
      const expenseMap: Record<string, { value: number; id: string }> = {};
      const incomeMap: Record<string, { value: number; id: string }> = {};

      transactions.forEach((t) => {
        const txDate = new Date(t.date);
        if (isWithinInterval(txDate, { start, end })) {
          const drAcc = accounts.find((a) => a.id === t.debitAccount);
          const crAcc = accounts.find((a) => a.id === t.creditAccount);

          if (drAcc && drAcc.type === "expense") {
            if (!expenseMap[drAcc.name])
              expenseMap[drAcc.name] = { value: 0, id: drAcc.id };
            expenseMap[drAcc.name].value += t.amount;
            expense += t.amount;
          }
          if (crAcc && crAcc.type === "income") {
            if (!incomeMap[crAcc.name])
              incomeMap[crAcc.name] = { value: 0, id: crAcc.id };
            incomeMap[crAcc.name].value += t.amount;
            income += t.amount;
          }
        }
      });

      return { income, expense, expenseMap, incomeMap };
    };

    const current = getMetricsForPeriod(startDate, endDate);
    const previous = getMetricsForPeriod(prevStartDate, prevEndDate);

    const expenseData = Object.entries(current.expenseMap)
      .map(([name, data]) => ({ name, value: data.value, id: data.id }))
      .sort((a, b) => b.value - a.value);

    const topExpenses = expenseData.slice(0, 5);

    const currentPeriodMetrics = {
      income: current.income,
      expense: current.expense,
      savings: current.income - current.expense,
      savingsRate:
        current.income > 0
          ? ((current.income - current.expense) / current.income) * 100
          : 0,
    };

    const previousPeriodMetrics = {
      income: previous.income,
      expense: previous.expense,
      savings: previous.income - previous.expense,
      savingsRate:
        previous.income > 0
          ? ((previous.income - previous.expense) / previous.income) * 100
          : 0,
    };

    // Unusual Spending (vs historical average)
    const sixMonthsAgo = subMonths(now, 6);
    const historicalTotals: Record<string, number> = {};
    let earliestDate = now;

    transactions.forEach((t) => {
      const txDate = new Date(t.date);
      if (txDate < earliestDate) earliestDate = txDate;

      if (txDate >= sixMonthsAgo && txDate <= now) {
        const drAcc = accounts.find((a) => a.id === t.debitAccount);
        if (drAcc && drAcc.type === "expense") {
          historicalTotals[drAcc.name] =
            (historicalTotals[drAcc.name] || 0) + t.amount;
        }
      }
    });

    // Calculate how many months of data we actually have (min 1, max 6)
    const monthsDiff =
      (now.getFullYear() - earliestDate.getFullYear()) * 12 +
      (now.getMonth() - earliestDate.getMonth()) +
      1;
    const activeMonths = Math.min(6, Math.max(1, monthsDiff));

    const unusualSpending: Array<{
      name: string;
      current: number;
      average: number;
      increase: number;
    }> = [];
    Object.entries(current.expenseMap).forEach(([name, data]) => {
      const monthlyAvg = (historicalTotals[name] || 0) / activeMonths;
      if (monthlyAvg > 0 && data.value > monthlyAvg * 1.2 && data.value > 100) {
        // > 20% increase and > $100
        unusualSpending.push({
          name,
          current: data.value,
          average: monthlyAvg,
          increase: ((data.value - monthlyAvg) / monthlyAvg) * 100,
        });
      }
    });
    unusualSpending.sort((a, b) => b.increase - a.increase);

    // Income vs Expense (Last 6 Months)
    const monthlyStats: Record<string, { income: number; expense: number }> =
      {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString("default", { month: "short" });
      monthlyStats[monthKey] = { income: 0, expense: 0 };
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const monthKey = d.toLocaleString("default", { month: "short" });

      if (monthlyStats[monthKey]) {
        const drAcc = accounts.find((a) => a.id === t.debitAccount);
        const crAcc = accounts.find((a) => a.id === t.creditAccount);

        if (drAcc && drAcc.type === "expense") {
          monthlyStats[monthKey].expense += t.amount;
        }
        if (crAcc && crAcc.type === "income") {
          monthlyStats[monthKey].income += t.amount;
        }
      }
    });

    const incomeVsExpenseData = Object.entries(monthlyStats).map(
      ([month, data]) => ({
        month,
        Income: data.income,
        Expense: data.expense,
      }),
    );

    return {
      expenseData,
      incomeVsExpenseData,
      topExpenses,
      currentPeriodMetrics,
      previousPeriodMetrics,
      unusualSpending,
    };
  }, [accounts, transactions, dateRange, customStart, customEnd]);

  const totalMonthlyExpense = expenseData.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const renderMetricChange = (
    current: number,
    previous: number,
    inverse = false,
  ) => {
    if (previous === 0) return null;
    const percentChange = ((current - previous) / Math.abs(previous)) * 100;
    const isPositive = percentChange > 0;
    const isGood = inverse ? !isPositive : isPositive;

    return (
      <div
        className={`flex items-center gap-1 text-xs font-medium mt-1 ${isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {Math.abs(percentChange).toFixed(1)}% vs previous
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl">
            <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Insights
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm">
              Visual analytics of your finances
            </p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-xl border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-gray-400 ml-2" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-gray-200 focus:ring-0 cursor-pointer"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2 px-2 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-gray-700 pt-2 sm:pt-0">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-sm bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md px-2 py-1 text-slate-700 dark:text-gray-300"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-sm bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md px-2 py-1 text-slate-700 dark:text-gray-300"
              />
            </div>
          )}
        </div>
      </div>

      {/* Unusual Spending Alerts */}
      {unusualSpending.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 md:p-5">
          <h3 className="text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5" /> Unusual Spending Detected
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unusualSpending.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/60 dark:bg-gray-900/50 p-3 rounded-xl border border-amber-100 dark:border-amber-800/30"
              >
                <p className="text-sm font-bold text-slate-800 dark:text-gray-200">
                  {item.name}
                </p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-500">
                    {formatCurrency(item.current)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">
                    vs {formatCurrency(item.average)} avg
                  </p>
                </div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">
                  +{item.increase.toFixed(0)}% higher than 6-mo average
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
              Income
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(currentPeriodMetrics.income)}
            </p>
            {renderMetricChange(
              currentPeriodMetrics.income,
              previousPeriodMetrics.income,
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
              Expenses
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(currentPeriodMetrics.expense)}
            </p>
            {renderMetricChange(
              currentPeriodMetrics.expense,
              previousPeriodMetrics.expense,
              true,
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
              Net Savings
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(currentPeriodMetrics.savings)}
              </p>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${currentPeriodMetrics.savingsRate >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
              >
                {currentPeriodMetrics.savingsRate.toFixed(1)}%
              </span>
            </div>
            {renderMetricChange(
              currentPeriodMetrics.savings,
              previousPeriodMetrics.savings,
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-blue-500" /> Expense Breakdown
          </h3>

          {expenseData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={(data) => {
                        if (data && data.payload && data.payload.id) {
                          setJournalFilterAccount(data.payload.id);
                          setJournalFilterSearch("");
                          setJournalFilterDate("all");
                          switchTab("transactions");
                        }
                      }}
                    >
                      {expenseData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {topExpenses.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                    onClick={() => {
                      setJournalFilterAccount(item.id);
                      setJournalFilterSearch("");
                      setJournalFilterDate("all");
                      switchTab("transactions");
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      ></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.value)}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400">
                        {((item.value / totalMonthlyExpense) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 dark:text-gray-400 text-sm">
              No expenses recorded in this period.
            </div>
          )}
        </div>

        {/* Income vs Expense */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Income vs
            Expense (6 Months)
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={incomeVsExpenseData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <RechartsTooltip
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                />
                <Bar
                  dataKey="Income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="Expense"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spending Heatmap */}
      <div className="w-full">
        <SpendingHeatmap
          onDayClick={(dateStr) => {
            setJournalFilterDate(dateStr);
            setJournalFilterAccount("");
            setJournalFilterSearch("");
            switchTab("transactions");
          }}
        />
      </div>
    </div>
  );
};
