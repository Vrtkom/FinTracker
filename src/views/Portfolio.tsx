import React, { useState, useMemo } from "react";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency } from "../utils/finance";
import {
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Activity,
  X,
  RefreshCw,
  PieChart as PieChartIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export const Portfolio = () => {
  const {
    portfolioItems,
    setPortfolioItems,
    user,
    accounts,
    transactions,
    setTransactions,
  } = useFinance();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Market Value Update Modal State
  const [updateValueAsset, setUpdateValueAsset] = useState<any | null>(null);
  const [newCurrentValueOrPrice, setNewCurrentValueOrPrice] = useState<
    number | string
  >("");

  // Trade Modal State
  const [tradeAsset, setTradeAsset] = useState<any | null>(null);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeDate, setTradeDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [tradeQuantity, setTradeQuantity] = useState<number>(0);
  const [tradePrice, setTradePrice] = useState<number>(0);
  const [tradeAmount, setTradeAmount] = useState<number>(0);

  const [name, setName] = useState("");
  const [type, setType] = useState("Stock");
  const [investmentType, setInvestmentType] = useState<
    "sip" | "one-time" | "sip+"
  >("one-time");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [ticker, setTicker] = useState("");
  const [linkToAccountId, setLinkToAccountId] = useState("");

  const [filter, setFilter] = useState("All");
  const [stockChartMetric, setStockChartMetric] = useState<
    "value" | "quantity"
  >("value");

  const [isSyncing, setIsSyncing] = useState(false);

  const inputClasses =
    "w-full px-4 py-3 bg-slate-50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-800 dark:text-white transition-all disabled:opacity-50";

  const handleSyncPrices = async () => {
    setIsSyncing(true);
    let updatedCount = 0;
    const itemsToUpdate = portfolioItems.filter(
      (item) => ["Stock", "Mutual Fund"].includes(item.type) && item.ticker && item.quantity,
    );

    if (itemsToUpdate.length === 0) {
      toast.info("No stocks with ticker symbols found to update.");
      setIsSyncing(false);
      return;
    }

    const updatedItems = [...portfolioItems];

    for (const item of itemsToUpdate) {
      if (!item.ticker) continue;
      try {
        if (item.type === "Mutual Fund") {
          const response = await fetch(`/api/mfQuote?schemeCode=${encodeURIComponent(item.ticker)}`);
          if (!response.ok) {
            const errText = await response.text().catch(() => "N/A");
            throw new Error(`Failed to fetch from AMFI backend proxy: ${response.status} ${errText.slice(0, 50)}`);
          }
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
             const htmlBody = await response.text();
             throw new Error(`Expected JSON but got HTML. First 100 chars: ${htmlBody.slice(0, 100)}`);
          }
          const data = await response.json();
          if (data && data.data && data.data.length > 0) {
            const latestPrice = parseFloat(data.data[0].nav);
            const itemIndex = updatedItems.findIndex((i) => i.id === item.id);

            if (itemIndex > -1 && latestPrice > 0 && updatedItems[itemIndex].quantity) {
              const itemQuantity = updatedItems[itemIndex].quantity;
              const newCurrentValue = latestPrice * (itemQuantity !== undefined ? itemQuantity : 0);
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                currentValue: newCurrentValue,
              };
              updatedCount++;
            }
          } else {
            toast.error(`Scheme code not found: ${item.ticker}`);
          }
        } else {
          // Fetch through our own backend proxy to bypass Brave/Adblockers completely.
          const response = await fetch(`/api/stockQuote?ticker=${encodeURIComponent(item.ticker)}`);
          
          if (!response.ok) {
             const errText = await response.text().catch(() => "N/A");
             throw new Error(`Failed to fetch from backend proxy: ${response.status} ${errText.slice(0, 50)}`);
          }

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
             const htmlBody = await response.text();
             throw new Error(`Expected JSON but got HTML. First 100 chars: ${htmlBody.slice(0, 100)}`);
          }

          const data = await response.json();
          const quote = data?.chart?.result?.[0];

          if (quote && quote.meta && quote.meta.regularMarketPrice) {
            const latestPrice = quote.meta.regularMarketPrice;
            const itemIndex = updatedItems.findIndex((i) => i.id === item.id);

            if (itemIndex > -1 && latestPrice > 0 && updatedItems[itemIndex].quantity) {
              const itemQuantity = updatedItems[itemIndex].quantity;
              const newCurrentValue = latestPrice * (itemQuantity !== undefined ? itemQuantity : 0);
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                currentValue: newCurrentValue,
              };
              updatedCount++;
            }
          } else if (data.chart?.error) {
            toast.error(`Symbol not found: ${item.ticker}`);
          }
        }
      } catch (err) {
        console.error(`Failed to update ${item.ticker}`, err);
      }

      // Small delay between proxy calls
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (updatedCount > 0) {
      setPortfolioItems(updatedItems);
      toast.success(
        `Successfully synced ${updatedCount} asset prices!`,
      );
    } else {
      toast.error("Failed to sync any prices or invalid tickers.");
    }

    setIsSyncing(false);
  };

  const filteredPortfolioItems = useMemo(() => {
    if (filter === "All") return portfolioItems;
    return portfolioItems.filter((item) => item.type === filter);
  }, [portfolioItems, filter]);

  const totalInvested = useMemo(
    () =>
      filteredPortfolioItems.reduce(
        (acc, item) => acc + (item.investedAmount || 0),
        0,
      ),
    [filteredPortfolioItems],
  );
  const totalCurrentValue = useMemo(
    () =>
      filteredPortfolioItems.reduce(
        (acc, item) => acc + (item.currentValue || 0),
        0,
      ),
    [filteredPortfolioItems],
  );
  const totalProfit = totalCurrentValue - totalInvested;
  const profitPercentage =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const allocationData = useMemo(() => {
    if (filter === "All") {
      const allocation = filteredPortfolioItems.reduce(
        (acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + (item.currentValue || 0);
          return acc;
        },
        {} as Record<string, number>,
      );
      return Object.entries(allocation)
        .filter(([_, value]: [string, number]) => value > 0)
        .map(([name, value]: [string, number]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    } else {
      const useQuantity = ["Stock", "Crypto", "Mutual Fund"].includes(filter) && stockChartMetric === "quantity";
      return filteredPortfolioItems
        .filter((item) =>
          useQuantity ? (item.quantity || 0) > 0 : (item.currentValue || 0) > 0,
        )
        .map((item) => ({
          name: item.name,
          value: useQuantity ? item.quantity || 0 : item.currentValue || 0,
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [filteredPortfolioItems, filter, stockChartMetric]);

  const totalAllocationValue = useMemo(
    () => allocationData.reduce((sum, item) => sum + item.value, 0),
    [allocationData],
  );

  const COLORS: Record<string, string> = {
    Stock: "#3b82f6", // blue-500
    "Mutual Fund": "#10b981", // emerald-500
    "Fixed Deposit / RD": "#f59e0b", // amber-500
    Crypto: "#8b5cf6", // violet-500
    Other: "#64748b", // slate-500
  };

  const getPieColor = (name: string, index: number) => {
    if (filter === "All") return COLORS[name] || COLORS["Other"];
    const PALETTE = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#f97316",
      "#eab308",
    ];
    return PALETTE[index % PALETTE.length];
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isUnitBased = ["Stock", "Crypto", "Mutual Fund"].includes(type);

    let finalInvested = 0;
    let finalCurrent = 0;
    let finalQty: number | undefined = undefined;

    if (isUnitBased) {
      if (!name || isNaN(Number(quantity)) || isNaN(Number(price))) return;
      finalQty = Number(quantity);
      finalInvested = finalQty * Number(price);
    } else {
      if (!name || isNaN(Number(investedAmount))) return;
      finalInvested = Number(investedAmount);
      finalCurrent = currentValue ? Number(currentValue) : finalInvested;
      finalQty = undefined;
    }

    if (editingItem) {
      const existing = portfolioItems.find((i) => i.id === editingItem);

      if (isUnitBased) {
        if (existing && existing.quantity && existing.quantity !== finalQty) {
          const pricePerUnit = existing.currentValue / existing.quantity;
          finalCurrent = finalQty * pricePerUnit;
        } else {
          finalCurrent = existing?.currentValue || finalInvested;
        }
      } else {
        finalCurrent = finalCurrent; // whatever they entered in the form
      }

      const updated = portfolioItems.map((item) =>
        item.id === editingItem
          ? {
              ...item,
              name,
              type,
              investmentType:
                type === "Mutual Fund" ? investmentType : undefined,
              investedAmount: finalInvested,
              currentValue: finalCurrent,
              quantity: finalQty,
              ticker:
                ["Stock", "Crypto", "Mutual Fund"].includes(type)
                  ? ticker || undefined
                  : undefined,
              linkToAccountId: linkToAccountId || undefined,
            }
          : item,
      );
      setPortfolioItems(updated);
    } else {
      const newItem = {
        id: Date.now().toString(),
        name,
        type,
        investmentType: type === "Mutual Fund" ? investmentType : undefined,
        investedAmount: finalInvested,
        currentValue: isUnitBased ? finalInvested : finalCurrent,
        quantity: finalQty,
        ticker:
          ["Stock", "Crypto", "Mutual Fund"].includes(type)
            ? ticker || undefined
            : undefined,
        linkToAccountId: linkToAccountId || undefined,
        uid: user.uid,
      };
      setPortfolioItems([...portfolioItems, newItem]);
    }

    resetForm();
  };

  const startEdit = (item: any) => {
    setName(item.name);
    setType(item.type);
    setInvestmentType(item.investmentType || "one-time");
    setQuantity(item.quantity?.toString() || "");
    // Compute average price if it exists
    const avgPrice =
      item.quantity && item.investedAmount
        ? (item.investedAmount / item.quantity).toFixed(2)
        : "";
    setPrice(avgPrice);
    setInvestedAmount(item.investedAmount?.toString() || "");
    setCurrentValue(item.currentValue?.toString() || "");
    setTicker(item.ticker || "");
    setLinkToAccountId(item.linkToAccountId || "");
    setEditingItem(item.id);
    setShowAddForm(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setPortfolioItems(portfolioItems.filter((i) => i.id !== itemToDelete));
      setItemToDelete(null);
    }
  };

  const resetForm = () => {
    setName("");
    setType("Stock");
    setInvestmentType("one-time");
    setQuantity("");
    setPrice("");
    setInvestedAmount("");
    setCurrentValue("");
    setTicker("");
    setLinkToAccountId("");
    setEditingItem(null);
    setShowAddForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-blue-500" />
            Portfolio
          </h2>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Track your investments and asset growth.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <button
            onClick={handleSyncPrices}
            disabled={isSyncing}
            className="bg-white hover:bg-slate-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Prices"}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            Add Asset
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          "All",
          "Stock",
          "Mutual Fund",
          "Fixed Deposit / RD",
          "Crypto",
          "Other",
        ].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${filter === f ? "bg-blue-600 text-white shadow-md" : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 mb-2">
            <DollarSign className="w-4 h-4" /> Invested Value
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalInvested)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-800 shadow-sm relative overflow-hidden flex flex-col justify-center">
          <div className="absolute -right-4 -bottom-4 text-emerald-500/10 dark:text-emerald-400/5">
            <TrendingUp className="w-32 h-32" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 mb-2">
              <Activity className="w-4 h-4" /> Current Value
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalCurrentValue)}
            </div>
          </div>
        </div>
        <div
          className={`rounded-2xl p-6 border shadow-sm flex flex-col justify-center ${totalProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30" : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30"}`}
        >
          <div
            className={`flex items-center gap-2 mb-2 ${totalProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
          >
            {totalProfit >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}{" "}
            Total Return
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {totalProfit >= 0 ? "+" : ""}
              {formatCurrency(totalProfit)}
            </span>
            <span
              className={`text-sm font-semibold px-2 py-0.5 rounded-full ${totalProfit >= 0 ? "bg-emerald-200/50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-red-200/50 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}
            >
              {totalProfit >= 0 ? "+" : ""}
              {profitPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Allocation Chart Card Container - Expanded for Desktop */}
      <div className="w-full lg:max-w-4xl mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 pl-2">
            <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
              <PieChartIcon className="w-4 h-4" /> Asset Allocation
            </div>
            {["Stock", "Crypto", "Mutual Fund"].includes(filter) && (
              <div className="flex bg-slate-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setStockChartMetric("value")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${stockChartMetric === "value" ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 dark:text-gray-400"}`}
                >
                  Value
                </button>
                <button
                  onClick={() => setStockChartMetric("quantity")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${stockChartMetric === "quantity" ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 dark:text-gray-400"}`}
                >
                  Quantity
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 w-full flex flex-col md:flex-row items-center justify-start gap-4 md:gap-8 py-2">
            {allocationData.length > 0 ? (
              <>
                <div className="w-full md:w-2/5 h-32 md:h-48 relative">
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationData}
                          innerRadius="60%"
                          outerRadius="80%"
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={getPieColor(entry.name, index)}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => {
                            const pct =
                              totalAllocationValue > 0
                                ? (
                                    (value / totalAllocationValue) *
                                    100
                                  ).toFixed(1)
                                : 0;
                            const useQuantity =
                              ["Stock", "Crypto", "Mutual Fund"].includes(filter) &&
                              stockChartMetric === "quantity";
                            const formattedVal = useQuantity
                              ? value.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })
                              : formatCurrency(value);
                            return [
                              `${formattedVal} (${pct}%)`,
                              useQuantity ? "Quantity" : "Value",
                            ];
                          }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            background: "#1e293b",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                          itemStyle={{ color: "#fff" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Mobile Legend - Hidden on Desktop */}
                <div className="w-full flex md:hidden justify-center gap-4 flex-wrap">
                  {allocationData.slice(0, 4).map((entry, index) => {
                    const pct =
                      totalAllocationValue > 0
                        ? Math.round((entry.value / totalAllocationValue) * 100)
                        : 0;
                    return (
                      <div
                        key={entry.name}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: getPieColor(entry.name, index),
                          }}
                        ></div>
                        <span className="text-slate-600 dark:text-gray-300 max-w-[80px] truncate">
                          {entry.name}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                  {allocationData.length > 4 && (
                    <div className="text-xs text-slate-400 font-medium flex items-center">
                      + {allocationData.length - 4} more
                    </div>
                  )}
                </div>
                {/* Desktop Legend Cards - Hidden on Mobile */}
                <div className="hidden md:grid w-full md:w-3/5 grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-gray-700">
                  {allocationData.map((entry, index) => {
                    const pct =
                      totalAllocationValue > 0
                        ? ((entry.value / totalAllocationValue) * 100).toFixed(
                            1,
                          )
                        : 0;
                    const useQuantity =
                      ["Stock", "Crypto", "Mutual Fund"].includes(filter) && stockChartMetric === "quantity";
                    const formattedVal = useQuantity
                      ? entry.value.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : formatCurrency(entry.value);

                    return (
                      <div
                        key={entry.name}
                        className="flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 transition-colors hover:bg-slate-100 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor: getPieColor(entry.name, index),
                            }}
                          ></div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-gray-300 truncate">
                            {entry.name}
                          </span>
                        </div>
                        <div className="flex items-end justify-between mt-auto">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
                            {formattedVal}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-200/50 dark:bg-gray-700/50 text-slate-600 dark:text-gray-300 rounded shrink-0">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 text-center font-medium py-10">
                No active assets
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {filteredPortfolioItems.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-slate-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              No investments yet
            </h3>
            <p className="text-slate-500 dark:text-gray-400 mb-6">
              Track your portfolio to see your wealth grow.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-6 py-2 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              Add First Asset
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-800/50 border-b border-slate-200 dark:border-gray-800">
                  <th className="p-4 font-semibold text-slate-600 dark:text-gray-300">
                    Asset
                  </th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-gray-300 text-right">
                    Invested
                  </th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-gray-300 text-right">
                    Current Value
                  </th>
                  <th className="p-4 font-semibold text-slate-600 dark:text-gray-300 text-right">
                    Return
                  </th>
                  <th className="p-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {filteredPortfolioItems.map((item) => {
                  const profit = item.currentValue - item.investedAmount;
                  const pct =
                    item.investedAmount > 0
                      ? (profit / item.investedAmount) * 100
                      : 0;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                          {item.name}
                          {item.linkToAccountId && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">
                              Linked
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-gray-400 mt-1 flex gap-2 items-center">
                          <span className="bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {item.type}
                          </span>
                          {item.ticker && (
                            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded uppercase font-bold text-[10px]">
                              {item.ticker}
                            </span>
                          )}
                          {item.investmentType && (
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase font-bold">
                              {item.investmentType}
                            </span>
                          )}
                          {item.quantity !== undefined &&
                          item.quantity !== null &&
                          item.quantity > 0 ? (
                            <span>• {item.quantity} units</span>
                          ) : (
                            ""
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right tabular-nums text-slate-600 dark:text-gray-300">
                        {formatCurrency(item.investedAmount)}
                        {item.quantity !== undefined &&
                        item.quantity !== null &&
                        item.quantity > 0 &&
                        item.investedAmount > 0 ? (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            @{" "}
                            {formatCurrency(
                              item.investedAmount / item.quantity,
                            )}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                        {formatCurrency(item.currentValue)}
                        {item.quantity !== undefined &&
                        item.quantity !== null &&
                        item.quantity > 0 &&
                        item.currentValue > 0 ? (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                            @{" "}
                            {formatCurrency(item.currentValue / item.quantity)}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        <div
                          className={`font-medium ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {formatCurrency(profit)}
                        </div>
                        <div
                          className={`text-xs mt-0.5 ${profit >= 0 ? "text-emerald-500/80 dark:text-emerald-500" : "text-red-400/80 dark:text-red-500"}`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {pct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="p-4 w-24 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setUpdateValueAsset(item);
                              if (
                                ["Stock", "Crypto", "Mutual Fund"].includes(item.type) &&
                                item.quantity
                              ) {
                                setNewCurrentValueOrPrice(
                                  (item.currentValue / item.quantity).toFixed(
                                    2,
                                  ),
                                );
                              } else {
                                setNewCurrentValueOrPrice(
                                  item.currentValue.toString(),
                                );
                              }
                            }}
                            title="Update Market Value"
                            className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (!item.linkToAccountId) {
                                alert(
                                  "Please 'Edit' this asset first and link it to an accounting ledger. Once linked, you can log sub-trades.",
                                );
                                startEdit(item);
                                return;
                              }
                              setTradeAsset(item);
                              setTradeQuantity(0);
                              setTradePrice(0);
                              setTradeAmount(0);
                              setTradeType("buy");
                              setTradeDate(
                                new Date().toISOString().split("T")[0],
                              );
                            }}
                            title="Log new trade (Buy/Sell)"
                            className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            title="Edit Asset"
                            className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item.id)}
                            title="Delete Asset"
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingItem ? (
                  <Edit2 className="w-5 h-5 text-blue-500" />
                ) : (
                  <Plus className="w-5 h-5 text-blue-500" />
                )}
                {editingItem ? "Edit Asset" : "Add New Asset"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                  Asset Name (e.g., Groww Nifty 50)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClasses}
                  required
                  autoFocus
                  placeholder="XYZ Stock"
                />
              </div>

              {["Stock", "Crypto", "Mutual Fund"].includes(type) && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                    {type === "Mutual Fund" ? "AMFI Scheme Code (for Auto Sync)" : "Ticker Symbol (for Auto Sync)"}
                  </label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className={inputClasses}
                    placeholder={type === "Mutual Fund" ? "e.g., 120503" : "e.g., AAPL"}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                  Asset Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClasses}
                >
                  <option value="Stock">Stock / Equity</option>
                  <option value="Mutual Fund">Mutual Fund</option>
                  <option value="Fixed Deposit / RD">Fixed Deposit / RD</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {type === "Mutual Fund" && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                    Investment Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="one-time"
                        checked={investmentType === "one-time"}
                        onChange={() => setInvestmentType("one-time")}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 dark:text-gray-300">
                        One-Time (Lumpsum)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="sip"
                        checked={investmentType === "sip"}
                        onChange={() => setInvestmentType("sip")}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 dark:text-gray-300">
                        SIP
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="sip+"
                        checked={investmentType === "sip+"}
                        onChange={() => setInvestmentType("sip+")}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 dark:text-gray-300">
                        SIP+
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5 flex justify-between">
                  Link to Accounting Ledger (Optional)
                </label>
                <select
                  value={linkToAccountId}
                  onChange={(e) => setLinkToAccountId(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">-- No linked account --</option>
                  {accounts
                    .filter((a) => a.type === "asset" || a.type === "equity")
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Select an account for automatic double-entry transaction
                  posting when you log trades here. Balances are purely
                  portfolio-driven.
                </p>
              </div>

              {["Stock", "Crypto", "Mutual Fund"].includes(type) ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                      Quantity / Units
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={inputClasses}
                      placeholder="1.0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5 flex items-center gap-2">
                      Avg Purchase Price Unit
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                        ₹
                      </span>
                      <input
                        type={"number"}
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={`${inputClasses} pl-8`}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                      Invested Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={investedAmount}
                        onChange={(e) => setInvestedAmount(e.target.value)}
                        className={`${inputClasses} pl-8`}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                      Current Total Value
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className={`${inputClasses} pl-8`}
                        placeholder="Same as invested"
                      />
                    </div>
                  </div>
                </div>
              )}

              {["Stock", "Crypto", "Mutual Fund"].includes(type) && (
                <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-gray-700 mb-2">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-slate-500 dark:text-gray-400">
                      Total Invested Amount:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(
                        (Number(price) || 0) * (Number(quantity) || 0),
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  {editingItem ? "Save Changes" : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tradeAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Log Trade: {tradeAsset.name}
              </h2>
              <button
                type="button"
                onClick={() => setTradeAsset(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!tradeAsset.linkToAccountId || !user) return;

                const isUnitBased = ["Stock", "Crypto", "Mutual Fund"].includes(
                  tradeAsset.type,
                );
                const tradeAmt = isUnitBased
                  ? tradeQuantity * tradePrice
                  : tradeAmount;
                if (isNaN(tradeAmt) || tradeAmt <= 0) return;

                // 1. Create Incomplete Transaction for Ledger
                const newTx = {
                  id: Date.now().toString(),
                  date: tradeDate,
                  description: `${tradeType === "buy" ? "Invested in" : "Withdrew from"} ${tradeAsset.name}${isUnitBased ? ` (${tradeQuantity} units)` : ""}`,
                  amount: tradeAmt,
                  debitAccount:
                    tradeType === "buy"
                      ? tradeAsset.linkToAccountId
                      : "PENDING",
                  creditAccount:
                    tradeType === "buy"
                      ? "PENDING"
                      : tradeAsset.linkToAccountId,
                  cleared: true,
                  receipt: null,
                  intent: "investment" as const,
                  uid: user.uid,
                };

                setTransactions([...transactions, newTx]);

                // 2. Update Portfolio Quantity, Invested Amount & Value
                const isBuy = tradeType === "buy";
                const oldQty = tradeAsset.quantity || 0;
                const newQty = isBuy
                  ? oldQty + tradeQuantity
                  : Math.max(0, oldQty - tradeQuantity);

                // New invested amount calculation
                const oldInvested = tradeAsset.investedAmount || 0;
                let newInvestedLocal = oldInvested;

                if (isBuy) {
                  newInvestedLocal += tradeAmt;
                } else {
                  // When selling, reduce invested amount proportionally if unit based, or by money sold
                  if (isUnitBased) {
                    if (oldQty > 0) {
                      newInvestedLocal = oldInvested * (newQty / oldQty);
                    } else {
                      newInvestedLocal = 0;
                    }
                  } else {
                    // For mutual funds/etc, if selling $500 out of $1000 current value, the invested amount
                    // is proportionately reduced.
                    const oldCurrent = tradeAsset.currentValue || oldInvested;
                    if (oldCurrent > 0) {
                      const proportionRemaining = Math.max(
                        0,
                        (oldCurrent - tradeAmt) / oldCurrent,
                      );
                      newInvestedLocal = oldInvested * proportionRemaining;
                    } else {
                      newInvestedLocal = Math.max(0, oldInvested - tradeAmt);
                    }
                  }
                }

                // Set the new current value mathematically based on the new traded price
                let newCurrentValue = tradeAsset.currentValue || 0;
                if (isUnitBased) {
                  newCurrentValue = newQty * tradePrice;
                } else {
                  newCurrentValue = isBuy
                    ? newCurrentValue + tradeAmt
                    : Math.max(0, newCurrentValue - tradeAmt);
                }

                const updatedItems = portfolioItems.map((i) => {
                  if (i.id === tradeAsset.id) {
                    return {
                      ...i,
                      quantity: isUnitBased ? newQty : undefined,
                      investedAmount: newInvestedLocal,
                      currentValue: newCurrentValue,
                    };
                  }
                  return i;
                });
                setPortfolioItems(updatedItems);
                setTradeAsset(null);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                    Trade Type
                  </label>
                  <select
                    value={tradeType}
                    onChange={(e) =>
                      setTradeType(e.target.value as "buy" | "sell")
                    }
                    className={inputClasses}
                  >
                    <option value="buy">
                      {["Stock", "Crypto", "Mutual Fund"].includes(tradeAsset?.type)
                        ? "Buy"
                        : "Invest More"}
                    </option>
                    <option value="sell">
                      {["Stock", "Crypto", "Mutual Fund"].includes(tradeAsset?.type)
                        ? "Sell"
                        : "Withdraw"}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                    Trade Date
                  </label>
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              {["Stock", "Crypto", "Mutual Fund"].includes(tradeAsset?.type) ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                      New Units/Quantity
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      value={tradeQuantity || ""}
                      onChange={(e) => setTradeQuantity(Number(e.target.value))}
                      className={inputClasses}
                      required
                      placeholder="1.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                      Price Per Unit
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tradePrice || ""}
                        onChange={(e) => setTradePrice(Number(e.target.value))}
                        className={`${inputClasses} pl-8`}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                    Amount {tradeType === "buy" ? "Invested" : "Withdrawn"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tradeAmount || ""}
                      onChange={(e) => setTradeAmount(Number(e.target.value))}
                      className={`${inputClasses} pl-8`}
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-slate-500 dark:text-gray-400">
                    Total {tradeType === "buy" ? "Investment" : "Return"}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(
                      ["Stock", "Crypto", "Mutual Fund"].includes(tradeAsset?.type)
                        ? tradeQuantity * tradePrice
                        : tradeAmount,
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Ledger Status</span>
                  <span className="font-bold text-amber-500">
                    Will mark as PENDING
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    ["Stock", "Crypto", "Mutual Fund"].includes(tradeAsset?.type)
                      ? !tradeQuantity || !tradePrice
                      : !tradeAmount
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  Log{" "}
                  {tradeType === "buy"
                    ? ["Stock", "Crypto", "Mutual Fund"].includes(tradeAsset?.type)
                      ? "Buy"
                      : "Investment"
                    : ["Stock", "Crypto", "Mutual Fund"].includes(tradeAsset?.type)
                      ? "Sell"
                      : "Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-200 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Delete Portfolio Item?
            </h2>
            <p className="text-slate-500 dark:text-gray-400 mb-8">
              Are you sure you want to remove this asset from your portfolio
              tracker? Your underlying accounting ledger and transactions will
              not be affected.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setItemToDelete(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 py-3 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20 active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {updateValueAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Update Market Value
              </h2>
              <button
                type="button"
                onClick={() => setUpdateValueAsset(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const isUnitBased = ["Stock", "Crypto", "Mutual Fund"].includes(
                  updateValueAsset.type,
                );
                const val = Number(newCurrentValueOrPrice);
                if (isNaN(val)) return;

                const updatedItems = portfolioItems.map((i) => {
                  if (i.id === updateValueAsset.id) {
                    return {
                      ...i,
                      currentValue:
                        isUnitBased && i.quantity ? val * i.quantity : val,
                    };
                  }
                  return i;
                });
                setPortfolioItems(updatedItems);
                setUpdateValueAsset(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                  {["Stock", "Crypto", "Mutual Fund"].includes(updateValueAsset.type)
                    ? "Current Market Price (Per Unit)"
                    : "Current Total Value"}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCurrentValueOrPrice}
                    onChange={(e) => setNewCurrentValueOrPrice(e.target.value)}
                    className={`${inputClasses} pl-8`}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {["Stock", "Crypto", "Mutual Fund"].includes(updateValueAsset.type) &&
                updateValueAsset.quantity > 0 && (
                  <div className="bg-slate-50 dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-gray-700 text-sm flex justify-between">
                    <span className="text-slate-500">
                      Calculated Total Value:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(
                        Number(newCurrentValueOrPrice) *
                          updateValueAsset.quantity,
                      )}
                    </span>
                  </div>
                )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                >
                  Save Value
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
