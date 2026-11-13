import React, { useMemo } from "react";
import {
  CalendarSearch,
  GitMerge,
  FastForward,
  FlaskConical,
  Hash,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Landmark,
  PieChart,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency, getTotals, getAccountBalance } from "../utils/finance";
import { resolveStandardPeriod } from "../utils/dateRange";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-google-charts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export const Reports = () => {
  const {
    accounts,
    transactions,
    recurring,
    customReport,
    setCustomReport,
    scenario,
    setScenario,
    portfolioItems,
  } = useFinance();

  const totals = useMemo(
    () => getTotals(accounts, transactions, portfolioItems),
    [accounts, transactions, portfolioItems],
  );

  const genRows = (
    type: string,
    colorClass: string,
    bgClass: string,
    totalAmount: number,
  ) => {
    const acts = accounts.filter((a) => a.type === type);
    if (acts.length === 0)
      return (
        <div className="text-[11px] md:text-xs text-slate-400 dark:text-gray-500 italic py-3 px-4 rounded-lg bg-slate-50 dark:bg-gray-800/30 border border-slate-100 dark:border-gray-800/50">
          No accounts
        </div>
      );
    return acts.map((acc) => {
      const bal = getAccountBalance(acc.id, accounts, transactions);
      if (acc.isArchived && bal === 0) return null;
      const pct =
        totalAmount > 0 ? (Math.abs(bal) / Math.abs(totalAmount)) * 100 : 0;
      return (
        <div
          key={acc.id}
          className="group relative flex justify-between items-center text-slate-700 dark:text-gray-300 py-3 px-4 rounded-xl hover:bg-white dark:hover:bg-gray-800/50 transition-all border-b border-slate-100/50 dark:border-gray-800/50 last:border-0 overflow-hidden"
        >
          <div
            className={`absolute left-0 top-0 bottom-0 ${bgClass} opacity-5 dark:opacity-10 transition-all duration-500`}
            style={{ width: `${pct}%` }}
          ></div>
          <div className="relative flex items-center gap-3 z-10">
            <div
              className={`w-2 h-2 rounded-full ${colorClass} shadow-sm`}
            ></div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-medium">
                {acc.name}{" "}
                {acc.isArchived && (
                  <span className="text-[9px] text-slate-400 dark:text-gray-500 ml-2 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                    Archived
                  </span>
                )}
              </span>
              {totalAmount > 0 && (
                <span className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">
                  {pct.toFixed(1)}% of total
                </span>
              )}
            </div>
          </div>
          <span className="relative font-mono font-semibold text-sm md:text-base tracking-tight z-10">
            {formatCurrency(bal)}
          </span>
        </div>
      );
    });
  };

  const generateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const s = customReport.startDate;
    const eDate = customReport.endDate;
    const detailed = customReport.showDetails;
    const repType = customReport.type;
    const compare = customReport.comparePreviousPeriod;

    if (!s || !eDate) return;

    const sDateObj = new Date(s);
    const eDateObj = new Date(eDate);
    const diffTime = Math.abs(eDateObj.getTime() - sDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const prevEDateObj = new Date(sDateObj);
    prevEDateObj.setDate(prevEDateObj.getDate() - 1);
    const prevSDateObj = new Date(prevEDateObj);
    prevSDateObj.setDate(prevSDateObj.getDate() - diffDays);

    const prevS = prevSDateObj.toISOString().split("T")[0];
    const prevE = prevEDateObj.toISOString().split("T")[0];

    const filtered = transactions.filter((t) => t.date >= s && t.date <= eDate);
    const prevFiltered = transactions.filter(
      (t) => t.date >= prevS && t.date <= prevE,
    );

    let inTotal = 0,
      outTotal = 0;
    let prevInTotal = 0,
      prevOutTotal = 0;
    const flows: any = { in: {}, out: {}, all: [] };
    const prevFlows: any = { in: {}, out: {} };

    if (repType === "pnl") {
      filtered.forEach((t) => {
        const crAcc = accounts.find((a) => a.id === t.creditAccount);
        const drAcc = accounts.find((a) => a.id === t.debitAccount);

        if (crAcc && crAcc.type === "income") {
          inTotal += t.amount;
          if (!flows.in[crAcc.id])
            flows.in[crAcc.id] = { name: crAcc.name, amount: 0, txs: [] };
          flows.in[crAcc.id].amount += t.amount;
          flows.in[crAcc.id].txs.push(t);
        }
        if (drAcc && drAcc.type === "expense") {
          outTotal += t.amount;
          if (!flows.out[drAcc.id])
            flows.out[drAcc.id] = { name: drAcc.name, amount: 0, txs: [] };
          flows.out[drAcc.id].amount += t.amount;
          flows.out[drAcc.id].txs.push(t);
        }
      });
      if (compare) {
        prevFiltered.forEach((t) => {
          const crAcc = accounts.find((a) => a.id === t.creditAccount);
          const drAcc = accounts.find((a) => a.id === t.debitAccount);
          if (crAcc && crAcc.type === "income") {
            prevInTotal += t.amount;
            if (!prevFlows.in[crAcc.id]) prevFlows.in[crAcc.id] = { amount: 0 };
            prevFlows.in[crAcc.id].amount += t.amount;
          }
          if (drAcc && drAcc.type === "expense") {
            prevOutTotal += t.amount;
            if (!prevFlows.out[drAcc.id])
              prevFlows.out[drAcc.id] = { amount: 0 };
            prevFlows.out[drAcc.id].amount += t.amount;
          }
        });
      }
    } else if (repType === "cashflow") {
      filtered.forEach((t) => {
        const crAcc = accounts.find((a) => a.id === t.creditAccount);
        const drAcc = accounts.find((a) => a.id === t.debitAccount);

        const isDebitLiquid =
          drAcc && drAcc.type === "asset" && drAcc.liquidity === "liquid";
        const isCreditLiquid =
          crAcc && crAcc.type === "asset" && crAcc.liquidity === "liquid";

        if (isDebitLiquid && !isCreditLiquid) {
          inTotal += t.amount;
          const sourceName = crAcc ? crAcc.name : "Unknown Source";
          if (!flows.in[t.creditAccount])
            flows.in[t.creditAccount] = {
              name: sourceName,
              amount: 0,
              txs: [],
            };
          flows.in[t.creditAccount].amount += t.amount;
          flows.in[t.creditAccount].txs.push(t);
        }
        if (isCreditLiquid && !isDebitLiquid) {
          outTotal += t.amount;
          const destName = drAcc ? drAcc.name : "Unknown Destination";
          if (!flows.out[t.debitAccount])
            flows.out[t.debitAccount] = { name: destName, amount: 0, txs: [] };
          flows.out[t.debitAccount].amount += t.amount;
          flows.out[t.debitAccount].txs.push(t);
        }
      });
      if (compare) {
        prevFiltered.forEach((t) => {
          const crAcc = accounts.find((a) => a.id === t.creditAccount);
          const drAcc = accounts.find((a) => a.id === t.debitAccount);
          const isDebitLiquid =
            drAcc && drAcc.type === "asset" && drAcc.liquidity === "liquid";
          const isCreditLiquid =
            crAcc && crAcc.type === "asset" && crAcc.liquidity === "liquid";
          if (isDebitLiquid && !isCreditLiquid) prevInTotal += t.amount;
          if (isCreditLiquid && !isDebitLiquid) prevOutTotal += t.amount;
        });
      }
    } else if (repType === "ledger") {
      inTotal = filtered.reduce((sum, t) => sum + t.amount, 0);
      flows.all = filtered.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    setCustomReport({
      ...customReport,
      data: {
        inTotal,
        outTotal,
        flows,
        prevInTotal,
        prevOutTotal,
        prevFlows,
        compare,
      },
      showSankey: repType === "pnl" || repType === "cashflow",
    });
  };

  const clearReport = () => {
    setCustomReport({ ...customReport, data: null, showSankey: false });
  };

  const applyScenario = (e: React.FormEvent) => {
    e.preventDefault();
    const desc = (
      document.getElementById("scenarioDesc") as HTMLInputElement
    ).value.trim();
    const amount = parseFloat(
      (document.getElementById("scenarioAmt") as HTMLInputElement).value,
    );
    const monthOffset = parseInt(
      (document.getElementById("scenarioMonth") as HTMLSelectElement).value,
    );
    if (!desc || isNaN(amount)) return;
    setScenario({ desc, amount, monthOffset });
  };

  const clearScenario = () => setScenario(null);

  const inputClasses =
    "w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl outline-none transition-all text-sm md:text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500";

  // Hashtag Analytics
  const tagMap: Record<string, number> = {};
  const todayStr = new Date().toISOString().split("T")[0];

  transactions.forEach((t) => {
    if (t.date > todayStr) return;
    const acc = accounts.find((a) => a.id === t.debitAccount);
    if (acc && acc.type === "expense") {
      const tags = t.description.match(/#[\w]+/g);
      if (tags) {
        tags.forEach((tag) => {
          tagMap[tag] = (tagMap[tag] || 0) + t.amount;
        });
      }
    }
  });
  const sortedTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);

  // Cash Flow Forecaster Data
  let recNet = 0;
  recurring.forEach((r) => {
    const cr = accounts.find((a) => a.id === r.creditAccount);
    const dr = accounts.find((a) => a.id === r.debitAccount);
    if (cr && cr.type === "income") recNet += r.amount;
    else if (dr && dr.type === "expense") recNet -= r.amount;
  });

  let forecastStartingCash = 0;
  accounts.forEach((acc) => {
    if (
      acc.type === "asset" &&
      acc.liquidity === "liquid" &&
      !acc.excludeFromForecast
    ) {
      forecastStartingCash += getAccountBalance(acc.id, accounts, transactions);
    }
  });

  const fcLabels = ["Today"];
  const fcDataOrig = [forecastStartingCash];
  const fcDataScen = [forecastStartingCash];

  let curLOrig = forecastStartingCash;
  let curLScen = forecastStartingCash;

  const d = new Date();
  for (let i = 1; i <= 6; i++) {
    d.setMonth(d.getMonth() + 1);
    fcLabels.push(d.toLocaleString("default", { month: "short" }));

    curLOrig += recNet;
    curLScen += recNet;

    if (scenario && i === scenario.monthOffset) {
      curLScen += scenario.amount;
    }

    fcDataOrig.push(curLOrig);
    fcDataScen.push(curLScen);
  }

  const isDark = document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#9ca3af" : "#64748b";
  const gridColor = isDark ? "#374151" : "#e2e8f0";

  const forecastChartData = {
    labels: fcLabels,
    datasets: [
      {
        label: "Base Projection",
        data: fcDataOrig,
        borderColor: "#6366f1",
        backgroundColor: scenario ? "transparent" : "rgba(99, 102, 241, 0.1)",
        borderWidth: 2,
        fill: !scenario,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#6366f1",
      },
      ...(scenario
        ? [
            {
              label: `Scenario: ${scenario.desc}`,
              data: fcDataScen,
              borderColor: "#a855f7",
              backgroundColor: "rgba(168, 85, 247, 0.1)",
              borderWidth: 2,
              borderDash: [5, 5],
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: "#a855f7",
            },
          ]
        : []),
    ],
  };

  const forecastChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !!scenario,
        labels: { color: textColor, font: { family: "sans-serif" } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: { grid: { color: gridColor }, ticks: { color: textColor } },
    },
  };

  // Sankey Data
  let sankeyData = null;
  if (
    customReport.showSankey &&
    customReport.data &&
    (customReport.type === "pnl" || customReport.type === "cashflow")
  ) {
    const rows: any[] = [];
    let tIn = 0;
    let tOut = 0;
    Object.values(customReport.data.flows.in).forEach((acc: any) => {
      if (acc.amount > 0) {
        rows.push([acc.name + " (In)", "Budget Pool", acc.amount]);
        tIn += acc.amount;
      }
    });
    Object.values(customReport.data.flows.out).forEach((acc: any) => {
      if (acc.amount > 0) {
        rows.push(["Budget Pool", acc.name + " (Out)", acc.amount]);
        tOut += acc.amount;
      }
    });

    if (tIn > tOut && tOut > 0)
      rows.push(["Budget Pool", "Saved / Unspent", tIn - tOut]);
    else if (tOut > tIn && tIn > 0)
      rows.push(["Savings / Debt", "Budget Pool", tOut - tIn]);

    if (rows.length > 0) {
      sankeyData = [["From", "To", "Amount"], ...rows];
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4 md:mb-8">
        Statements & Insights
      </h2>

      <div className="bg-white dark:bg-gray-900 p-5 md:p-8 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm mb-6 md:mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <CalendarSearch className="w-5 h-5 text-blue-500" /> Custom Date Range
          Report
        </h3>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
          Analyze cash flows and transactions over any specific period.
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {(
            [
              { key: "this_month", label: "This Month" },
              { key: "last_month", label: "Last Month" },
              { key: "this_year", label: "This Year (Jan–Dec)" },
              { key: "this_fy", label: "This FY (Apr–Mar)" },
              { key: "last_year", label: "Last Year (Jan–Dec)" },
              { key: "last_fy", label: "Last FY (Apr–Mar)" },
            ] as const
          ).map((preset) => {
            const bounds = resolveStandardPeriod(preset.key);
            const isActive =
              customReport.startDate === bounds.startStr &&
              customReport.endDate === bounds.endStr;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() =>
                  setCustomReport({
                    ...customReport,
                    startDate: bounds.startStr,
                    endDate: bounds.endStr,
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                    : "bg-slate-50 dark:bg-gray-800/70 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <form onSubmit={generateReport} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="w-full md:w-auto flex-1">
              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                Report Type
              </label>
              <select
                value={customReport.type}
                onChange={(e) =>
                  setCustomReport({
                    ...customReport,
                    type: e.target.value as any,
                  })
                }
                className={`${inputClasses} py-2.5`}
              >
                <option value="pnl">P&L (Income vs Expense)</option>
                <option value="cashflow">Asset Cash Flow</option>
                <option value="ledger">Full Ledger</option>
              </select>
            </div>
            <div className="w-full md:w-auto flex-1">
              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={customReport.startDate}
                onChange={(e) =>
                  setCustomReport({
                    ...customReport,
                    startDate: e.target.value,
                  })
                }
                className={`${inputClasses} py-2.5`}
                required
              />
            </div>
            <div className="w-full md:w-auto flex-1">
              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={customReport.endDate}
                onChange={(e) =>
                  setCustomReport({ ...customReport, endDate: e.target.value })
                }
                className={`${inputClasses} py-2.5`}
                required
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-4 px-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="repDetailed"
                  checked={customReport.showDetails}
                  onChange={(e) =>
                    setCustomReport({
                      ...customReport,
                      showDetails: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 cursor-pointer accent-blue-600"
                />
                <label
                  htmlFor="repDetailed"
                  className="text-sm font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                >
                  Detailed View
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="repCompare"
                  checked={customReport.comparePreviousPeriod}
                  onChange={(e) =>
                    setCustomReport({
                      ...customReport,
                      comparePreviousPeriod: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 cursor-pointer accent-blue-600"
                />
                <label
                  htmlFor="repCompare"
                  className="text-sm font-medium text-slate-600 dark:text-gray-400 cursor-pointer"
                >
                  Compare to Previous Period
                </label>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                type="submit"
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors text-sm shadow-md shadow-blue-500/20"
              >
                Generate
              </button>
              {customReport.data && (
                <button
                  type="button"
                  onClick={clearReport}
                  className="flex-1 md:flex-none bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>

        {customReport.data && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-gray-800 animate-fade-in">
            {customReport.type === "pnl" || customReport.type === "cashflow" ? (
              <>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                  Report Summary
                </h4>
                <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 md:p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center relative">
                    <p className="text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 font-bold">
                      {customReport.type === "pnl" ? "Income" : "Inflow"}
                    </p>
                    <p className="text-base md:text-xl font-black text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(customReport.data.inTotal)}
                    </p>
                    {customReport.data.compare &&
                      customReport.data.prevInTotal > 0 && (
                        <div
                          className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${customReport.data.inTotal >= customReport.data.prevInTotal ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300"}`}
                        >
                          {customReport.data.inTotal >=
                          customReport.data.prevInTotal
                            ? "↑"
                            : "↓"}{" "}
                          {Math.abs(
                            ((customReport.data.inTotal -
                              customReport.data.prevInTotal) /
                              customReport.data.prevInTotal) *
                              100,
                          ).toFixed(1)}
                          % vs prev
                        </div>
                      )}
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 md:p-4 rounded-xl border border-red-100 dark:border-red-900/30 text-center relative">
                    <p className="text-[10px] md:text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-1 font-bold">
                      {customReport.type === "pnl" ? "Expense" : "Outflow"}
                    </p>
                    <p className="text-base md:text-xl font-black text-red-700 dark:text-red-300">
                      {formatCurrency(customReport.data.outTotal)}
                    </p>
                    {customReport.data.compare &&
                      customReport.data.prevOutTotal > 0 && (
                        <div
                          className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${customReport.data.outTotal <= customReport.data.prevOutTotal ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300"}`}
                        >
                          {customReport.data.outTotal <=
                          customReport.data.prevOutTotal
                            ? "↓"
                            : "↑"}{" "}
                          {Math.abs(
                            ((customReport.data.outTotal -
                              customReport.data.prevOutTotal) /
                              customReport.data.prevOutTotal) *
                              100,
                          ).toFixed(1)}
                          % vs prev
                        </div>
                      )}
                  </div>
                  <div className="bg-slate-100 dark:bg-gray-800 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-gray-700 text-center relative">
                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-bold">
                      Net Flow
                    </p>
                    <p
                      className={`text-base md:text-xl font-black ${customReport.data.inTotal - customReport.data.outTotal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {customReport.data.inTotal - customReport.data.outTotal >
                      0
                        ? "+"
                        : ""}
                      {formatCurrency(
                        customReport.data.inTotal - customReport.data.outTotal,
                      )}
                    </p>
                    {customReport.data.compare &&
                      customReport.data.prevInTotal -
                        customReport.data.prevOutTotal !==
                        0 && (
                        <div
                          className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${customReport.data.inTotal - customReport.data.outTotal >= customReport.data.prevInTotal - customReport.data.prevOutTotal ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300"}`}
                        >
                          {customReport.data.inTotal -
                            customReport.data.outTotal >=
                          customReport.data.prevInTotal -
                            customReport.data.prevOutTotal
                            ? "↑"
                            : "↓"}{" "}
                          {Math.abs(
                            ((customReport.data.inTotal -
                              customReport.data.outTotal -
                              (customReport.data.prevInTotal -
                                customReport.data.prevOutTotal)) /
                              Math.abs(
                                customReport.data.prevInTotal -
                                  customReport.data.prevOutTotal,
                              )) *
                              100,
                          ).toFixed(1)}
                          % vs prev
                        </div>
                      )}
                  </div>
                </div>

                {customReport.data.compare && (
                  <div className="mt-6 mb-6">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" /> Key
                      Insights
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(customReport.data.flows.out).map((accId) => {
                        const currentAmt =
                          customReport.data.flows.out[accId].amount;
                        const prevAmt =
                          customReport.data.prevFlows.out[accId]?.amount || 0;
                        if (prevAmt > 0 && currentAmt !== prevAmt) {
                          const diff = currentAmt - prevAmt;
                          const percent = Math.abs(
                            (diff / prevAmt) * 100,
                          ).toFixed(0);
                          if (diff < 0 && parseInt(percent) >= 5) {
                            return (
                              <div
                                key={accId}
                                className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                              >
                                <span>🎉</span> You spent {percent}% less on{" "}
                                {customReport.data.flows.out[accId].name} this
                                period!
                              </div>
                            );
                          } else if (diff > 0 && parseInt(percent) >= 5) {
                            return (
                              <div
                                key={accId}
                                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                              >
                                <span>⚠️</span>{" "}
                                {customReport.data.flows.out[accId].name}{" "}
                                expenses are up {percent}%.
                              </div>
                            );
                          }
                        }
                        return null;
                      })}
                      {Object.keys(customReport.data.flows.in).map((accId) => {
                        const currentAmt =
                          customReport.data.flows.in[accId].amount;
                        const prevAmt =
                          customReport.data.prevFlows.in[accId]?.amount || 0;
                        if (prevAmt > 0 && currentAmt !== prevAmt) {
                          const diff = currentAmt - prevAmt;
                          const percent = Math.abs(
                            (diff / prevAmt) * 100,
                          ).toFixed(0);
                          if (diff > 0 && parseInt(percent) >= 5) {
                            return (
                              <div
                                key={accId}
                                className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                              >
                                <span>🚀</span>{" "}
                                {customReport.data.flows.in[accId].name} income
                                increased by {percent}%!
                              </div>
                            );
                          }
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {Object.keys(customReport.data.flows.in).length > 0 && (
                  <div className="mt-8 border-t border-slate-100 dark:border-gray-800 pt-6 animate-fade-in">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomReport({
                          ...customReport,
                          showSankey: !customReport.showSankey,
                        })
                      }
                      className="w-full flex justify-between items-center group focus:outline-none"
                    >
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <GitMerge className="w-5 h-5 text-indigo-500" /> Cash
                        Flow Map
                      </h4>
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 group-hover:bg-slate-200 dark:group-hover:bg-gray-700 transition-colors">
                        {customReport.showSankey ? (
                          <ChevronUp className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                        )}
                      </div>
                    </button>

                    {customReport.showSankey && sankeyData && (
                      <div className="mt-6 w-full h-[350px]">
                        <Chart
                          chartType="Sankey"
                          width="100%"
                          height="100%"
                          data={sankeyData}
                          options={{
                            sankey: {
                              node: {
                                nodePadding: 30,
                                width: 12,
                                colors: [
                                  "#3b82f6",
                                  "#8b5cf6",
                                  "#10b981",
                                  "#f43f5e",
                                  "#f59e0b",
                                  "#0ea5e9",
                                  "#ec4899",
                                  "#14b8a6",
                                ],
                                label: {
                                  color: isDark ? "#ffffff" : "#1f2937",
                                  fontName: "sans-serif",
                                  fontSize: 12,
                                  bold: true,
                                },
                              },
                              link: {
                                colorMode: "gradient",
                                fillOpacity: 0.85,
                              },
                            },
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                  Ledger Summary
                </h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 md:p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 font-bold">
                      Total Activity Volume
                    </p>
                    <p className="text-2xl md:text-3xl font-black text-blue-700 dark:text-blue-300">
                      {formatCurrency(customReport.data.inTotal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                      {customReport.data.flows.all.length} Entries
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col relative">
          <div className="p-8 md:p-10 pb-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Income Statement
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mt-1">
                    Revenue & Expenses
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Revenues */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">
                      Revenues
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                    Cr
                  </span>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800/50 p-2">
                  {genRows(
                    "income",
                    "bg-emerald-500",
                    "bg-emerald-500",
                    totals.income,
                  )}
                  <div className="flex justify-between items-center p-4 mt-2 bg-white dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm">
                    <span className="font-bold text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Total Revenue
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                      {formatCurrency(totals.income)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">
                      Expenses
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                    Dr
                  </span>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800/50 p-2">
                  {genRows(
                    "expense",
                    "bg-red-500",
                    "bg-red-500",
                    totals.expenses,
                  )}
                  <div className="flex justify-between items-center p-4 mt-2 bg-white dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm">
                    <span className="font-bold text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Total Expenses
                    </span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 text-lg">
                      {formatCurrency(totals.expenses)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`mt-auto p-8 md:p-10 border-t border-slate-100 dark:border-gray-800 ${totals.netIncome >= 0 ? "bg-gradient-to-b from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-900/5" : "bg-gradient-to-b from-red-50/50 to-red-100/50 dark:from-red-900/10 dark:to-red-900/5"}`}
          >
            <div className="flex justify-between items-end">
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-widest mb-2 ${totals.netIncome >= 0 ? "text-emerald-600/80 dark:text-emerald-500/80" : "text-red-600/80 dark:text-red-500/80"}`}
                >
                  Bottom Line
                </p>
                <h4
                  className={`text-2xl font-black ${totals.netIncome >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
                >
                  Net Profit
                </h4>
              </div>
              <div
                className={`font-mono text-4xl md:text-5xl font-black tracking-tighter ${totals.netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {formatCurrency(totals.netIncome)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col relative">
          <div className="p-8 md:p-10 pb-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Balance Sheet
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mt-1">
                    Assets, Liabilities & Equity
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Assets */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">
                      Assets
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                    Dr
                  </span>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800/50 p-2">
                  {genRows(
                    "asset",
                    "bg-blue-500",
                    "bg-blue-500",
                    totals.assets,
                  )}
                  <div className="flex justify-between items-center p-4 mt-2 bg-white dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm">
                    <span className="font-bold text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Total Assets
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">
                      {formatCurrency(totals.assets)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-orange-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">
                      Liabilities
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                    Cr
                  </span>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800/50 p-2">
                  {genRows(
                    "liability",
                    "bg-orange-500",
                    "bg-orange-500",
                    totals.liabilities,
                  )}
                  <div className="flex justify-between items-center p-4 mt-2 bg-white dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm">
                    <span className="font-bold text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Total Liabilities
                    </span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-lg">
                      {formatCurrency(totals.liabilities)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">
                      Equity
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                    Cr
                  </span>
                </div>
                <div className="bg-slate-50/50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800/50 p-2">
                  {genRows(
                    "equity",
                    "bg-purple-500",
                    "bg-purple-500",
                    totals.equity,
                  )}
                  <div className="flex justify-between items-center p-4 mt-2 bg-white dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-800 shadow-sm">
                    <span className="font-bold text-slate-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Total Equity
                    </span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-lg">
                      {formatCurrency(totals.equity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto p-8 md:p-10 border-t border-slate-100 dark:border-gray-800 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-gray-800/10 dark:to-gray-800/5">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-500 dark:text-gray-500">
                  Total Value
                </p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                  Calculated Net Worth
                </h4>
              </div>
              <div className="font-mono text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                {formatCurrency(totals.netWorth)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-5 md:p-8 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <FastForward className="w-5 h-5 text-indigo-500" /> Cash Flow
            Forecaster
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
            6-month projection of your active Liquid Cash (ignores "Stashed"
            accounts) based on your saved recurring templates.
          </p>
          <div className="h-64 w-full">
            <Line data={forecastChartData} options={forecastChartOptions} />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-800">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-500" /> What-If
              Scenario Simulator
            </h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
              Test a hypothetical expense or income to see how it affects your
              6-month runway.
            </p>
            <form
              onSubmit={applyScenario}
              className="flex flex-col md:flex-row gap-3 items-end"
            >
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">
                  Scenario Description
                </label>
                <input
                  type="text"
                  id="scenarioDesc"
                  placeholder="e.g. Buy a Bike, Job Loss"
                  defaultValue={scenario?.desc || ""}
                  className={`${inputClasses} py-2.5`}
                  required
                />
              </div>
              <div className="w-full md:w-36">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">
                  Amount (+ or -)
                </label>
                <input
                  type="number"
                  id="scenarioAmt"
                  placeholder="-50000"
                  defaultValue={scenario?.amount || ""}
                  className={`${inputClasses} py-2.5`}
                  required
                />
              </div>
              <div className="w-full md:w-40">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">
                  When to apply?
                </label>
                <select
                  id="scenarioMonth"
                  defaultValue={scenario?.monthOffset || 1}
                  className={`${inputClasses} py-2.5`}
                >
                  {[1, 2, 3, 4, 5, 6].map((m) => (
                    <option key={m} value={m}>
                      In {m} Month{m > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="submit"
                  className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors text-sm shadow-md shadow-purple-500/20"
                >
                  Simulate
                </button>
                {scenario && (
                  <button
                    type="button"
                    onClick={clearScenario}
                    className="flex-none bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-5 md:p-8 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-500" /> Hashtag Analytics & Trips
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
            Total spending extracted from tags (e.g. #GoaTrip) in your expense
            descriptions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTags.length > 0 ? (
              sortedTags.map(([tag, amt]) => (
                <div
                  key={tag}
                  className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50 flex justify-between items-center"
                >
                  <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
                    {tag}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(amt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-full text-slate-400 dark:text-gray-500 text-sm italic p-4 text-center border border-dashed border-slate-200 dark:border-gray-700 rounded-xl">
                No #hashtags found in expense entries.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
