import React, { useState, useRef, useEffect } from "react";
import {
  LayoutGrid,
  Edit2,
  RefreshCw,
  Trash2,
  Target,
  Plus,
  Save,
  CreditCard,
  Wallet,
  Building,
  Briefcase,
  ShoppingBag,
  Coffee,
  Landmark,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import {
  formatCurrency,
  getAccountBalance,
  getAccountColor,
} from "../utils/finance";
import { AccountType, Liquidity, Account } from "../types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { AccountDetails } from "./AccountDetails";

export const Accounts = ({
  switchTab,
}: {
  switchTab?: (tab: string) => void;
}) => {
  const {
    accounts,
    setAccounts,
    transactions,
    setManagingPotsFor,
    setJournalFilterAccount,
    setJournalFilterSearch,
    setJournalFilterDate,
    setGlobalAddTxDefaults,
    goals,
    advancedMode,
    showGlobalAddAccount,
    setShowGlobalAddAccount,
  } = useFinance();

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [viewingAccountId, setViewingAccountId] = useState<string | null>(null);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<AccountType>("asset");
  const [newAccLiquidity, setNewAccLiquidity] = useState<Liquidity>("liquid");
  const [newAccBudget, setNewAccBudget] = useState("");
  const [newAccExcludeForecast, setNewAccExcludeForecast] = useState(false);
  const [newAccCreditLimit, setNewAccCreditLimit] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showGlobalAddAccount) {
      setEditingAccountId(null);
      setViewingAccountId(null);
      nameInputRef.current?.focus();
      setShowGlobalAddAccount(false);
    }
  }, [showGlobalAddAccount, setShowGlobalAddAccount]);

  const editAcc = editingAccountId
    ? accounts.find((a) => a.id === editingAccountId)
    : null;
  const formTitle = editAcc ? "Edit Account" : "New Account Name";

  useEffect(() => {
    if (editAcc) {
      setNewAccName(editAcc.name);
      setNewAccType(editAcc.type);
      setNewAccLiquidity(editAcc.liquidity || "liquid");
      setNewAccBudget(editAcc.budget ? String(editAcc.budget) : "");
      setNewAccExcludeForecast(editAcc.excludeFromForecast || false);
      setNewAccCreditLimit(
        editAcc.creditLimit ? String(editAcc.creditLimit) : "",
      );
      nameInputRef.current?.focus();
    } else {
      setNewAccName("");
      setNewAccType("asset");
      setNewAccLiquidity("liquid");
      setNewAccBudget("");
      setNewAccExcludeForecast(false);
      setNewAccCreditLimit("");
    }
  }, [editAcc]);

  const [confirmModal, setConfirmModal] = useState<{
    type: "archive" | "hardDelete";
    id: string;
  } | null>(null);

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAccName.trim();
    if (!name) return;

    const budget = newAccType === "expense" ? parseFloat(newAccBudget) || 0 : 0;
    const liquidity = newAccType === "asset" ? newAccLiquidity : "liquid";
    const excludeFromForecast =
      newAccType === "asset" ? newAccExcludeForecast : false;
    const creditLimit =
      newAccType === "liability" ? parseFloat(newAccCreditLimit) || null : null;

    if (editingAccountId) {
      const updated = accounts.map((a) => {
        if (a.id === editingAccountId) {
          const updatedAcc: Account = {
            ...a,
            name,
            type: newAccType,
            liquidity,
            budget,
            excludeFromForecast,
          };
          if (creditLimit !== null) {
            updatedAcc.creditLimit = creditLimit;
          } else {
            delete updatedAcc.creditLimit;
          }
          return updatedAcc;
        }
        return a;
      });
      setAccounts(updated);
      setEditingAccountId(null);
    } else {
      const newAcc: Account = {
        id: Date.now().toString(),
        name,
        type: newAccType,
        liquidity,
        budget,
        excludeFromForecast,
        isArchived: false,
        pots: [],
        order: accounts.length,
      };
      if (creditLimit !== null) {
        newAcc.creditLimit = creditLimit;
      }
      setAccounts([...accounts, newAcc]);
    }
  };

  const deleteAccount = (id: string) => {
    const isUsed = transactions.some(
      (t) => t.debitAccount === id || t.creditAccount === id,
    );
    if (isUsed) {
      setConfirmModal({ type: "archive", id });
      return;
    }
    setAccounts(accounts.filter((a) => a.id !== id));
  };

  const unarchiveAccount = (id: string) => {
    setAccounts(
      accounts.map((a) => (a.id === id ? { ...a, isArchived: false } : a)),
    );
  };

  const hardDeleteAccount = (id: string) => {
    setConfirmModal({ type: "hardDelete", id });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    const type = result.type as AccountType;

    const typeAccounts = accounts
      .filter((a) => a.type === type)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const otherAccounts = accounts.filter((a) => a.type !== type);

    const reorderedTypeAccounts = Array.from(typeAccounts);
    const [removed] = reorderedTypeAccounts.splice(sourceIndex, 1);
    reorderedTypeAccounts.splice(destinationIndex, 0, removed);

    // Update order property
    const updatedTypeAccounts = (reorderedTypeAccounts as Account[])
      .filter((a) => a !== undefined)
      .map((a, index) => ({ ...a, order: index }));

    setAccounts([...otherAccounts, ...updatedTypeAccounts]);
  };

  const inputClasses =
    "w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl outline-none transition-all text-sm md:text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500";

  const renderSparkline = (accountId: string, color: string) => {
    const accountTxs = transactions
      .filter(
        (t) => t.debitAccount === accountId || t.creditAccount === accountId,
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let currentBal = getAccountBalance(accountId, accounts, transactions);
    const data = [{ date: "Now", balance: currentBal }];

    for (const tx of accountTxs.slice(0, 30)) {
      // Just last 30 txs for sparkline
      if (tx.debitAccount === accountId) {
        currentBal -= tx.amount;
      } else if (tx.creditAccount === accountId) {
        currentBal += tx.amount;
      }
      data.unshift({ date: tx.date, balance: currentBal });
    }

    return (
      <div className="h-8 w-20 opacity-50 group-hover:opacity-100 transition-opacity hidden md:block">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Line
              type="monotone"
              dataKey="balance"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case "asset":
        return Wallet;
      case "expense":
        return ShoppingBag;
      case "income":
        return Briefcase;
      case "liability":
        return CreditCard;
      case "equity":
        return Building;
      default:
        return Landmark;
    }
  };

  const renderGroup = (
    type: AccountType,
    title: string,
    colorClass: string,
  ) => {
    const acts = accounts
      .filter((a) => a.type === type)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return (
      <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
        <h3
          className={`text-base md:text-lg font-bold mb-4 flex items-center gap-2 ${colorClass}`}
        >
          {title}
        </h3>
        <Droppable droppableId={type} type={type}>
          {(provided) => (
            <div
              className="space-y-2 md:space-y-3"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {acts.length > 0 ? (
                acts.map((acc, index) => {
                  const linkedGoals = goals.filter(
                    (g) => g.linkedAccountId === acc.id,
                  );
                  const totalGoalTarget = linkedGoals.reduce(
                    (sum, g) => sum + g.targetAmount,
                    0,
                  );
                  const bal = getAccountBalance(acc.id, accounts, transactions);
                  const IconComponent = getAccountIcon(acc.type);
                  const accColor = getAccountColor(acc.type);

                  return (
                    // @ts-ignore
                    <Draggable key={acc.id} draggableId={acc.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => setViewingAccountId(acc.id)}
                          className={`flex flex-col p-3.5 md:p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl group border ${snapshot.isDragging ? "border-blue-500 shadow-md" : "border-slate-100 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600"} transition-colors cursor-pointer ${acc.isArchived ? "opacity-50" : ""}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 truncate pr-2">
                              <div
                                className="p-2 rounded-lg shrink-0"
                                style={{ backgroundColor: `${accColor}20` }}
                              >
                                <IconComponent
                                  className="w-4 h-4"
                                  style={{ color: accColor }}
                                />
                              </div>
                              <span className="text-sm md:text-base font-medium text-slate-800 dark:text-gray-200 truncate">
                                {acc.name}
                                {acc.isArchived && (
                                  <span className="text-[10px] bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 px-1.5 py-0.5 rounded ml-1 uppercase">
                                    Archived
                                  </span>
                                )}
                                {acc.excludeFromForecast && (
                                  <span className="ml-2 text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 rounded border border-indigo-100 dark:border-transparent">
                                    Stashed
                                  </span>
                                )}
                                {acc.type === "expense" &&
                                  (acc.budget || 0) > 0 && (
                                    <span className="ml-2 text-[10px] uppercase font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 rounded border border-orange-100 dark:border-transparent">
                                      Limit: {formatCurrency(acc.budget || 0)}
                                    </span>
                                  )}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {renderSparkline(acc.id, accColor)}
                              <span className="font-bold text-slate-900 dark:text-white text-sm md:text-base mr-1">
                                {formatCurrency(bal)}
                              </span>
                              {acc.type === "liability" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (switchTab) {
                                      setGlobalAddTxDefaults({
                                        type: "transfer",
                                        creditAccount: acc.id,
                                      });
                                      setJournalFilterAccount("");
                                      setJournalFilterSearch("");
                                      setJournalFilterDate("all");
                                      switchTab("transactions");
                                    }
                                  }}
                                  title="Pay Bill"
                                  className="text-slate-400 hover:text-emerald-500 dark:text-gray-500 dark:hover:text-emerald-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  <span className="text-[10px] font-bold uppercase hidden md:inline">
                                    Pay
                                  </span>
                                </button>
                              )}
                              {acc.type === "asset" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManagingPotsFor(acc.id);
                                  }}
                                  title="Manage Pots"
                                  className="text-slate-400 hover:text-purple-500 dark:text-gray-500 dark:hover:text-purple-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <LayoutGrid className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAccountId(acc.id);
                                }}
                                title="Edit Account"
                                className="text-slate-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {acc.isArchived ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unarchiveAccount(acc.id);
                                    }}
                                    title="Unarchive"
                                    className="text-slate-400 hover:text-emerald-500 dark:text-gray-500 dark:hover:text-emerald-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg transition-all"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                  {bal === 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        hardDeleteAccount(acc.id);
                                      }}
                                      title="Permanently Delete"
                                      className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAccount(acc.id);
                                  }}
                                  title="Delete/Archive"
                                  className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {acc.type === "asset" &&
                            acc.liquidity === "invested" && (
                              <p className="text-[11px] md:text-xs text-purple-600 dark:text-purple-400 mt-1 ml-11">
                                Invested
                              </p>
                            )}
                          {acc.type === "asset" && linkedGoals.length > 0 && (
                            <div className="mt-2 ml-11 flex items-center gap-1.5 text-[10px] md:text-xs text-purple-600 dark:text-purple-400 font-medium">
                              <Target className="w-3.5 h-3.5" />
                              <span>
                                {formatCurrency(Math.min(bal, totalGoalTarget))}{" "}
                                reserved for {linkedGoals.length} goal(s)
                              </span>
                            </div>
                          )}
                          {acc.type === "asset" &&
                            acc.pots &&
                            acc.pots.length > 0 && (
                              <div className="ml-11 mt-3">
                                <div className="bg-slate-200 dark:bg-gray-700 h-1.5 rounded-full flex overflow-hidden">
                                  {acc.pots.map((p) => (
                                    <div
                                      key={p.id}
                                      className="bg-blue-500 h-full border-r border-white dark:border-gray-800"
                                      style={{
                                        width: `${(p.amount / getAccountBalance(acc.id, accounts, transactions)) * 100}%`,
                                      }}
                                      title={p.name}
                                    ></div>
                                  ))}
                                </div>
                                <p className="text-[9px] text-slate-500 dark:text-gray-400 mt-1">
                                  {acc.pots.length} Virtual Pot(s) Active
                                </p>
                              </div>
                            )}
                        </div>
                      )}
                    </Draggable>
                  );
                })
              ) : (
                <div className="p-6 border border-dashed border-slate-200 dark:border-gray-700 rounded-2xl text-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Wallet className="w-6 h-6 text-slate-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">
                    No {title.split(" ")[0]} yet
                  </p>
                  <p className="text-xs text-slate-400 dark:text-gray-500">
                    Add an account above to get started.
                  </p>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  const totalAssets = accounts
    .filter((a) => a.type === "asset")
    .reduce(
      (sum, a) => sum + getAccountBalance(a.id, accounts, transactions),
      0,
    );
  const totalLiabilities = accounts
    .filter((a) => a.type === "liability")
    .reduce(
      (sum, a) => sum + getAccountBalance(a.id, accounts, transactions),
      0,
    );
  const netWorth = totalAssets - totalLiabilities;

  if (viewingAccountId) {
    return (
      <AccountDetails
        accountId={viewingAccountId}
        onBack={() => setViewingAccountId(null)}
        onEdit={(id) => {
          setViewingAccountId(null);
          setEditingAccountId(id);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Accounts
        </h2>
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-emerald-500/20 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <p className="text-emerald-100 font-medium mb-1">Net Worth</p>
          <h3 className="text-4xl md:text-5xl font-bold tracking-tight">
            {formatCurrency(netWorth)}
          </h3>
        </div>
        <div className="flex gap-6 w-full md:w-auto bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
          <div>
            <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">
              Assets
            </p>
            <p className="text-xl font-bold">{formatCurrency(totalAssets)}</p>
          </div>
          <div className="w-px bg-emerald-400/30"></div>
          <div>
            <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">
              Liabilities
            </p>
            <p className="text-xl font-bold">
              {formatCurrency(totalLiabilities)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          {editAcc ? (
            <Edit2 className="w-5 h-5 text-blue-500" />
          ) : (
            <Plus className="w-5 h-5 text-blue-500" />
          )}
          {formTitle}
        </h3>
        <form onSubmit={saveAccount} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              ref={nameInputRef}
              type="text"
              placeholder="e.g. Chase Checking, Amex Gold, Rent"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              className={inputClasses}
              required
            />
            <select
              value={newAccType}
              onChange={(e) => setNewAccType(e.target.value as AccountType)}
              className={inputClasses}
            >
              <option value="asset">Asset (Bank, Cash, Investment)</option>
              <option value="liability">Liability (Credit Card, Loan)</option>
              <option value="income">Income Source (Salary, Dividends)</option>
              <option value="expense">
                Expense Category (Groceries, Rent)
              </option>
              {advancedMode && (
                <option value="equity">Equity (Starting Balances)</option>
              )}
            </select>
          </div>

          {newAccType === "asset" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={newAccLiquidity}
                onChange={(e) =>
                  setNewAccLiquidity(e.target.value as Liquidity)
                }
                className={inputClasses}
              >
                <option value="liquid">Liquid (Cash, Checking)</option>
                <option value="invested">Invested (Stocks, Retirement)</option>
              </select>
              <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAccExcludeForecast}
                  onChange={(e) => setNewAccExcludeForecast(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Stash Account (Exclude from Safe-to-Spend)
                </span>
              </label>
            </div>
          )}
          {newAccType === "expense" && (
            <input
              type="number"
              placeholder="Monthly Budget Limit (Optional)"
              value={newAccBudget}
              onChange={(e) => setNewAccBudget(e.target.value)}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          )}
          {newAccType === "liability" && (
            <input
              type="number"
              placeholder="Credit Limit (Optional)"
              value={newAccCreditLimit}
              onChange={(e) => setNewAccCreditLimit(e.target.value)}
              className={inputClasses}
              min="0"
              step="0.01"
            />
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />{" "}
              {editAcc ? "Save Changes" : "Add Account"}
            </button>
            {editAcc && (
              <button
                type="button"
                onClick={() => setEditingAccountId(null)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 px-6 py-3 rounded-xl text-sm font-bold transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {renderGroup(
              "asset",
              "Assets",
              "text-emerald-600 dark:text-emerald-400",
            )}
            {renderGroup(
              "liability",
              "Liabilities",
              "text-red-600 dark:text-red-400",
            )}
            {advancedMode &&
              renderGroup(
                "equity",
                "Equity",
                "text-purple-600 dark:text-purple-400",
              )}
          </div>
          <div className="space-y-6">
            {renderGroup(
              "income",
              "Income Sources",
              "text-blue-600 dark:text-blue-400",
            )}
            {renderGroup(
              "expense",
              "Expense Categories",
              "text-orange-600 dark:text-orange-400",
            )}
          </div>
        </div>
      </DragDropContext>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {confirmModal.type === "archive"
                ? "Archive Account?"
                : "Permanently Delete?"}
            </h3>
            <p className="text-slate-600 dark:text-gray-400 mb-6">
              {confirmModal.type === "archive"
                ? "This account has transactions associated with it. It will be archived and hidden from most views, but its history will be preserved."
                : "This account has no transactions and will be permanently deleted. This action cannot be undone."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.type === "archive") {
                    setAccounts(
                      accounts.map((a) =>
                        a.id === confirmModal.id
                          ? { ...a, isArchived: true }
                          : a,
                      ),
                    );
                  } else {
                    setAccounts(
                      accounts.filter((a) => a.id !== confirmModal.id),
                    );
                  }
                  setConfirmModal(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {confirmModal.type === "archive" ? "Archive" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
