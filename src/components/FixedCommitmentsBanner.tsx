import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Home,
  Receipt,
  Repeat,
  Plus,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Landmark,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  Sparkles,
  SkipForward,
  RotateCcw,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency } from "../utils/finance";
import {
  calculateSpendableSummary,
  setManualPaid,
  setManualSkipped,
  CommitmentMonthStatus,
} from "../utils/fixedCommitments";
import { FixedCommitmentModal } from "./Modals/FixedCommitmentModal";
import { Recurring } from "../types";
import { toast } from "sonner";

export const FixedCommitmentsBanner = ({
  selectedAccountId,
  onSelectAccount,
}: {
  selectedAccountId?: string;
  onSelectAccount?: (id: string | undefined) => void;
}) => {
  const {
    accounts,
    recurring,
    setRecurring,
    transactions,
    setTransactions,
    hideBalances,
  } = useFinance();

  const [isExpanded, setIsExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Recurring | null>(null);
  const [actionTick, setActionTick] = useState(0);

  const summary = useMemo(() => {
    return calculateSpendableSummary(accounts, recurring, transactions);
  }, [accounts, recurring, transactions, actionTick]);

  // If a specific bank account is selected, compute its individual slice
  const activeBreakdown = useMemo(() => {
    if (!selectedAccountId) return null;
    return (
      summary.accountBreakdowns.find(
        (b) => b.account.id === selectedAccountId,
      ) || null
    );
  }, [summary, selectedAccountId]);

  const displayBalance = activeBreakdown
    ? activeBreakdown.currentBalance
    : summary.totalBankBalance;
  const displayPending = activeBreakdown
    ? activeBreakdown.pendingFixedAmount
    : summary.totalPendingFixed;
  const displayRemaining = activeBreakdown
    ? activeBreakdown.remainingToSpend
    : summary.remainingToSpend;
  const displayCommitments = activeBreakdown
    ? activeBreakdown.commitments
    : summary.allCommitments;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const blurClass = hideBalances ? "blur-[6px] select-none" : "";

  // 1-Click "Deduct / Post Now"
  const handlePostTransaction = async (
    status: CommitmentMonthStatus,
    mondayDateStr?: string,
  ) => {
    const today = mondayDateStr || new Date().toISOString().split("T")[0];
    const targetCreditAccount = status.commitment.creditAccount;
    const targetDebitAccount =
      status.commitment.debitAccount || targetCreditAccount;

    const newTx = {
      id: `tx_${Date.now()}`,
      date: today,
      description: status.commitment.description,
      amount: status.commitment.amount,
      debitAccount: targetDebitAccount,
      creditAccount: targetCreditAccount,
      cleared: true,
      receipt: null,
      tags: [status.category, "fixed-outflow", status.commitment.id],
    };

    await setTransactions([newTx, ...transactions]);

    // Also mark in manual paid state to be safe
    const key = mondayDateStr
      ? `${status.commitment.id}_monday_${mondayDateStr}`
      : `${status.commitment.id}_month`;
    setManualPaid(year, month, key, true);
    setActionTick((prev) => prev + 1);

    const bankAcc = accounts.find((a) => a.id === targetCreditAccount);
    toast.success(
      `Deducted ${formatCurrency(status.commitment.amount)} from ${bankAcc?.name || "bank account"}`,
    );
  };

  const handleToggleManualPaid = (
    status: CommitmentMonthStatus,
    mondayDateStr?: string,
  ) => {
    const key = mondayDateStr
      ? `${status.commitment.id}_monday_${mondayDateStr}`
      : `${status.commitment.id}_month`;
    const isCurrentlyPaid = mondayDateStr
      ? status.occurrences.find((o) => o.dateStr === mondayDateStr)?.isPaid
      : status.isFullyPaid;

    setManualPaid(year, month, key, !isCurrentlyPaid);
    setActionTick((prev) => prev + 1);
    toast.info(
      isCurrentlyPaid ? "Marked as pending" : "Marked as paid this cycle",
    );
  };

  const handleTogglePass = (
    status: CommitmentMonthStatus,
    mondayDateStr?: string,
  ) => {
    const key = mondayDateStr
      ? `${status.commitment.id}_monday_${mondayDateStr}`
      : `${status.commitment.id}_month`;
    const isCurrentlySkipped = mondayDateStr
      ? status.occurrences.find((o) => o.dateStr === mondayDateStr)?.isSkipped
      : status.isSkipped;

    setManualSkipped(year, month, key, !isCurrentlySkipped);
    setActionTick((prev) => prev + 1);
    toast.info(
      isCurrentlySkipped
        ? "Resumed commitment (will be deducted)"
        : "Passed on this entry (won't be deducted from bank balance)",
    );
  };

  const handleDeleteCommitment = async (id: string, name: string) => {
    if (confirm(`Remove fixed commitment "${name}"?`)) {
      await setRecurring(recurring.filter((r) => r.id !== id));
      toast.success(`Removed ${name}`);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "sip":
        return <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "rent":
        return <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "bill":
        return <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Repeat className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "sip":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800";
      case "rent":
        return "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800";
      case "bill":
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700";
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 md:p-7 shadow-xl border border-indigo-900/50 mb-8 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-indigo-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                <Landmark className="w-5 h-5 text-indigo-400" />
              </span>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Bank Outflows & Remaining to Spend
              </h2>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              Tracks monthly fixed SIPs, rent & bills with their dates, plus weekly Monday SIPs — deducted directly from your Bank account.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setEditingItem(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fixed Item</span>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-700/50 text-indigo-200 text-xs font-medium transition-all"
            >
              <span>{isExpanded ? "Collapse" : "View Details"}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Bank Account Selector Pills (if multiple bank accounts exist) */}
        {summary.accountBreakdowns.length > 1 && onSelectAccount && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <span className="text-indigo-300/80 font-medium whitespace-nowrap">Bank Account:</span>
            <button
              onClick={() => onSelectAccount(undefined)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                !selectedAccountId
                  ? "bg-white text-slate-900 shadow-md font-bold"
                  : "bg-indigo-900/40 text-indigo-200 hover:bg-indigo-900/70"
              }`}
            >
              All Bank Accounts ({summary.accountBreakdowns.length})
            </button>
            {summary.accountBreakdowns.map((b) => (
              <button
                key={b.account.id}
                onClick={() => onSelectAccount(b.account.id)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedAccountId === b.account.id
                    ? "bg-white text-slate-900 shadow-md font-bold"
                    : "bg-indigo-900/40 text-indigo-200 hover:bg-indigo-900/70"
                }`}
              >
                {b.account.name}
              </button>
            ))}
          </div>
        )}

        {/* 3 High-Impact Cards: Bank Balance - Pending Commitments = Remaining to Spend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Card 1: Bank Balance */}
          <div className="p-4 rounded-2xl bg-indigo-900/30 border border-indigo-800/40 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                {activeBreakdown ? `${activeBreakdown.account.name} Balance` : "Total Bank Balance"}
              </span>
              <Landmark className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className={`text-2xl md:text-3xl font-extrabold text-white ${blurClass}`}>
                {formatCurrency(displayBalance)}
              </div>
              <p className="text-[11px] text-indigo-300/70 mt-1">
                {activeBreakdown ? "Balance in this bank account" : "Available in your Bank accounts tab"}
              </p>
            </div>
          </div>

          {/* Card 2: Minus Pending Fixed Obligations */}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                Pending Fixed Outflows ({summary.currentMonthName})
              </span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className={`text-2xl md:text-3xl font-extrabold text-rose-300 ${blurClass}`}>
                - {formatCurrency(displayPending)}
              </div>
              <p className="text-[11px] text-rose-300/80 mt-1">
                Upcoming SIP, Rent & Bills yet to be deducted
              </p>
            </div>
          </div>

          {/* Card 3: Remaining to Spend (THE KEY NUMBER) */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 shadow-inner flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Remaining to Spend
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="relative z-10">
              <div className={`text-2xl md:text-3xl font-black text-emerald-300 ${blurClass}`}>
                {formatCurrency(displayRemaining)}
              </div>
              <p className="text-[11px] text-emerald-200/90 font-medium mt-1">
                Safe to spend from bank after fixed commitments
              </p>
            </div>
          </div>
        </div>

        {/* Weekly SIP Monday intelligence strip */}
        <div className="px-4 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>{summary.currentMonthName} {summary.currentYear}</strong> has{" "}
              <strong className="text-white">{summary.mondaysInMonthCount} Mondays</strong> (
              {summary.upcomingMondaysCount} remaining).
            </span>
          </div>
          <span className="text-indigo-300 text-[11px]">
            Weekly SIPs automatically account for 4 vs 5 Mondays (e.g. ₹1,000 vs ₹1,250).
          </span>
        </div>

        {/* Expandable Breakdown Drawer */}
        {isExpanded && (
          <div className="mt-5 pt-5 border-t border-indigo-800/40 space-y-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Active Fixed Commitments Checklist</span>
                <span className="text-xs font-normal text-indigo-300">
                  ({displayCommitments.length} total)
                </span>
              </h3>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setModalOpen(true);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            </div>

            {displayCommitments.length === 0 ? (
              <div className="p-8 text-center bg-indigo-950/40 rounded-2xl border border-indigo-800/40">
                <Calendar className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
                <p className="text-sm text-indigo-200 font-medium">
                  No fixed commitments configured yet.
                </p>
                <p className="text-xs text-indigo-300/70 mt-1 max-w-md mx-auto">
                  Add your monthly SIPs, flat rent, electricity bills, and weekly Monday SIPs to track their exact dates and deduct them from your bank balance.
                </p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  + Add First Fixed Commitment
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayCommitments.map((status) => {
                  const bankAcc = accounts.find(
                    (a) => a.id === status.commitment.creditAccount,
                  );

                  return (
                    <div
                      key={status.commitment.id}
                      className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 hover:border-indigo-700 transition-all flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Title and Category */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-indigo-900/60 border border-indigo-700/50 shrink-0 mt-0.5">
                            {getCategoryIcon(status.category)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">
                                {status.commitment.description}
                              </span>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getCategoryBadgeClass(
                                  status.category,
                                )}`}
                              >
                                {status.category}
                              </span>
                              <span className="text-[11px] text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded font-mono">
                                📅 {status.dueDateDescription}
                              </span>
                            </div>
                            <p className="text-xs text-indigo-300/80 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>Deducted from Bank:</span>
                              <strong className="text-white">
                                {bankAcc?.name || "Bank Account"}
                              </strong>
                              {status.frequency === "weekly" ? (
                                <span className="text-emerald-300 text-[11px] font-semibold">
                                  ({status.paidOccurrencesCount}/{status.occurrencesCount} Mondays cleared
                                  {status.skippedOccurrencesCount > 0 ? `, ${status.skippedOccurrencesCount} passed` : ""})
                                </span>
                              ) : status.isUpcoming && !status.isFullyPaid && !status.isSkipped ? (
                                <span className="text-amber-300 text-[11px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">
                                  ⏳ Date yet to come ({status.dueDateFormatted}) — Pending
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>

                        {/* Amount & Status & Action */}
                        <div className="flex items-center gap-2.5 self-end sm:self-center flex-wrap justify-end">
                          <div className="text-right">
                            <div className="text-base font-extrabold text-white">
                              {formatCurrency(status.totalExpectedThisMonth)}
                            </div>
                            <div className="text-[11px] font-medium">
                              {status.isSkipped ? (
                                <span className="text-amber-400 flex items-center justify-end gap-1">
                                  <SkipForward className="w-3 h-3" /> Passed on
                                </span>
                              ) : status.isFullyPaid ? (
                                <span className="text-emerald-400 flex items-center justify-end gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Cleared
                                </span>
                              ) : (
                                <span className="text-rose-300">
                                  {formatCurrency(status.pendingAmount)} Pending
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {status.isSkipped ? (
                            <button
                              onClick={() => handleTogglePass(status)}
                              title="Resume / Unskip this commitment"
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-800/80 hover:bg-indigo-700 text-indigo-200 text-xs font-semibold transition-all border border-indigo-600/50 flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Resume</span>
                            </button>
                          ) : (
                            <>
                              {!status.isFullyPaid && (
                                <button
                                  onClick={() => handlePostTransaction(status)}
                                  title="Deduct and post transaction now to bank"
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1"
                                >
                                  <span>Deduct Now</span>
                                </button>
                              )}

                              {status.frequency === "monthly" && !status.isFullyPaid && (
                                <button
                                  onClick={() => handleTogglePass(status)}
                                  title="Skip/Pass this entry for this month (won't be deducted from bank balance)"
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 hover:text-white text-xs font-medium transition-all border border-indigo-700/50 flex items-center gap-1"
                                >
                                  <SkipForward className="w-3 h-3 text-indigo-400" />
                                  <span>Pass this month</span>
                                </button>
                              )}

                              {status.isFullyPaid && (
                                <button
                                  onClick={() => handleToggleManualPaid(status)}
                                  title="Mark as pending"
                                  className="px-2 py-1 rounded-lg bg-indigo-900/40 hover:bg-indigo-900 text-indigo-300 text-xs transition-all"
                                >
                                  Mark Pending
                                </button>
                              )}
                            </>
                          )}

                          {/* Edit / Delete */}
                          <div className="flex items-center gap-1 text-indigo-300">
                            <button
                              onClick={() => {
                                setEditingItem(status.commitment);
                                setModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-indigo-900/60 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteCommitment(
                                  status.commitment.id,
                                  status.commitment.description,
                                )
                              }
                              className="p-1.5 rounded-lg hover:bg-rose-900/40 hover:text-rose-300 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* For weekly SIPs: render individual Monday chips with Deduct and Pass/Skip options */}
                      {status.frequency === "weekly" && status.occurrences.length > 0 && (
                        <div className="pt-2 border-t border-indigo-900/40 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-[11px] text-indigo-400 font-medium mr-1">
                            Monday Occurrences:
                          </span>
                          {status.occurrences.map((occ) => {
                            return (
                              <div
                                key={occ.dateStr}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-2 border transition-all ${
                                  occ.isSkipped
                                    ? "bg-slate-900/80 border-slate-700/60 text-slate-400 line-through"
                                    : occ.isPaid
                                    ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                                    : occ.isPast
                                    ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                                    : "bg-indigo-900/60 border-indigo-700/50 text-indigo-200"
                                }`}
                              >
                                {occ.isSkipped ? (
                                  <span className="text-slate-400 no-underline font-sans text-[10px] uppercase font-bold">
                                    Passed
                                  </span>
                                ) : occ.isPaid ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-400" />
                                )}
                                <span>Mon {occ.dateStr.slice(5)}</span>
                                <span className="font-bold">
                                  {formatCurrency(occ.amount)}
                                </span>

                                {/* Quick action buttons for this Monday */}
                                <div className="flex items-center gap-1 pl-1 border-l border-indigo-800/60 no-underline">
                                  {occ.isSkipped ? (
                                    <button
                                      onClick={() => handleTogglePass(status, occ.dateStr)}
                                      className="text-blue-400 hover:text-blue-300 underline text-[10px]"
                                      title="Resume this Monday"
                                    >
                                      Resume
                                    </button>
                                  ) : occ.isPaid ? (
                                    <button
                                      onClick={() => handleToggleManualPaid(status, occ.dateStr)}
                                      className="text-slate-400 hover:text-white text-[10px]"
                                      title="Mark pending"
                                    >
                                      Reset
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handlePostTransaction(status, occ.dateStr)}
                                        className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                                        title="Deduct this Monday now"
                                      >
                                        Deduct
                                      </button>
                                      <button
                                        onClick={() => handleTogglePass(status, occ.dateStr)}
                                        className="px-1.5 py-0.5 rounded bg-indigo-800 hover:bg-indigo-700 text-indigo-200 text-[10px]"
                                        title="Pass / Skip this Monday"
                                      >
                                        Pass
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal to add/edit fixed commitment */}
      <FixedCommitmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialCommitment={editingItem}
        preselectedAccountId={selectedAccountId}
      />
    </div>
  );
};
