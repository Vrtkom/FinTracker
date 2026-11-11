import React, { useState, useEffect } from "react";
import { X, Calendar, Plus, Save, TrendingUp, Home, Receipt, Repeat, AlertCircle } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import { Recurring, FixedCommitmentCategory, FixedCommitmentFrequency } from "../../types";
import { formatCurrency } from "../../utils/finance";
import { getMondaysInMonth, getEligibleBankAccounts } from "../../utils/fixedCommitments";
import { toast } from "sonner";

export const FixedCommitmentModal = ({
  isOpen,
  onClose,
  initialCommitment,
  preselectedAccountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCommitment?: Recurring | null;
  preselectedAccountId?: string;
}) => {
  const { accounts, recurring, setRecurring } = useFinance();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<FixedCommitmentCategory>("sip");
  const [frequency, setFrequency] = useState<FixedCommitmentFrequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [bankAccountId, setBankAccountId] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");

  // Only take real BANK accounts from the Accounts tab - strictly exclude Liquid Cash
  const bankAccounts = getEligibleBankAccounts(accounts);
  const expenseAndAssetAccounts = accounts.filter(
    (a) => (a.type === "expense" || a.type === "asset") && !a.isArchived
  );

  const now = new Date();
  const mondaysThisMonth = getMondaysInMonth(now.getFullYear(), now.getMonth());

  useEffect(() => {
    if (initialCommitment) {
      setDescription(initialCommitment.description || "");
      setAmount(initialCommitment.amount ? String(initialCommitment.amount) : "");
      setCategory(initialCommitment.category || "sip");
      setFrequency(initialCommitment.frequency || (initialCommitment.dayOfWeek === 1 ? "weekly" : "monthly"));
      setDayOfMonth(String(initialCommitment.day || 5));
      setBankAccountId(initialCommitment.creditAccount || "");
      setDebitAccountId(initialCommitment.debitAccount || "");
    } else {
      setDescription("");
      setAmount("");
      setCategory("sip");
      setFrequency("monthly");
      setDayOfMonth("5");
      // Choose preselected if it's an eligible bank account, otherwise default to first real bank
      const validPreselect = bankAccounts.find((b) => b.id === preselectedAccountId);
      setBankAccountId(validPreselect ? validPreselect.id : (bankAccounts[0]?.id || ""));
      setDebitAccountId("");
    }
  }, [initialCommitment, isOpen, preselectedAccountId, accounts]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDesc = description.trim();
    const cleanAmt = parseFloat(amount);

    if (!cleanDesc) {
      toast.error("Please enter a name or description");
      return;
    }
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!bankAccountId) {
      toast.error("Please select a bank account to deduct from");
      return;
    }

    const targetDebit = debitAccountId || bankAccountId; // fallback to same account or expense
    const day = frequency === "monthly" ? Math.max(1, Math.min(31, parseInt(dayOfMonth) || 1)) : 1;
    const dayOfWeek = frequency === "weekly" ? 1 : undefined; // 1 = Monday

    const newCommitment: Recurring = {
      id: initialCommitment?.id || `fixed_${Date.now()}`,
      description: cleanDesc,
      amount: cleanAmt,
      creditAccount: bankAccountId, // The bank account being deducted
      debitAccount: targetDebit, // Expense / Investment account
      day,
      category,
      frequency,
      dayOfWeek,
    };

    let updatedList: Recurring[];
    if (initialCommitment) {
      updatedList = recurring.map((r) => (r.id === initialCommitment.id ? newCommitment : r));
      toast.success(`Updated ${cleanDesc}`);
    } else {
      updatedList = [...recurring, newCommitment];
      toast.success(`Added ${cleanDesc}`);
    }

    await setRecurring(updatedList);
    onClose();
  };

  const parsedAmount = parseFloat(amount) || 0;
  const weeklyMonthlyTotal = frequency === "weekly" ? parsedAmount * mondaysThisMonth.length : parsedAmount;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-gray-800 transition-all">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {initialCommitment ? "Edit Fixed Commitment" : "Add Fixed Commitment"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Auto-tracks SIPs, Rent, and Bills and deducts from bank balance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Commitment Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCategory("sip")}
                className={`py-2.5 px-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-medium border transition-all ${
                  category === "sip"
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 shadow-sm"
                    : "border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>SIP / Invest</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory("rent")}
                className={`py-2.5 px-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-medium border transition-all ${
                  category === "rent"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 shadow-sm"
                    : "border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
                }`}
              >
                <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Rent</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory("bill")}
                className={`py-2.5 px-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-medium border transition-all ${
                  category === "bill"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
                }`}
              >
                <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Bill</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory("other")}
                className={`py-2.5 px-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-medium border transition-all ${
                  category === "other"
                    ? "bg-slate-100 dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-slate-800 dark:text-white shadow-sm"
                    : "border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800"
                }`}
              >
                <Repeat className="w-4 h-4 text-slate-500" />
                <span>Other</span>
              </button>
            </div>
          </div>

          {/* Description / Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Name / Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                category === "sip"
                  ? "e.g. Nippon India Power & Infra / Weekly Index SIP"
                  : category === "rent"
                  ? "e.g. Flat Rent / House Rent"
                  : "e.g. Electricity Bill / Wi-Fi"
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 rounded-xl outline-none text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          {/* Frequency Selector: Monthly vs Weekly (Monday) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                className={`py-3 px-4 rounded-xl border text-left transition-all ${
                  frequency === "monthly"
                    ? "border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 font-semibold shadow-sm"
                    : "border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300"
                }`}
              >
                <div className="text-sm font-bold">Monthly Fixed</div>
                <div className="text-xs text-slate-500 dark:text-gray-400">Fixed day of every month</div>
              </button>
              <button
                type="button"
                onClick={() => setFrequency("weekly")}
                className={`py-3 px-4 rounded-xl border text-left transition-all ${
                  frequency === "weekly"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 font-semibold shadow-sm"
                    : "border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300"
                }`}
              >
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>Weekly SIP</span>
                  <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 px-1.5 py-0.2 rounded font-bold">
                    Mondays
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-gray-400">Every Monday morning</div>
              </button>
            </div>
          </div>

          {/* Date Picker depending on Frequency */}
          {frequency === "monthly" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Monthly Due Date (Day of Month)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-24 p-3 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 rounded-xl outline-none text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white font-bold"
                />
                <span className="text-sm text-slate-600 dark:text-gray-300">
                  th of every month (e.g. 5 for rent, 10 for electricity bill)
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Weekly Monday Trigger Details</span>
              </div>
              <p>
                This month has <strong>{mondaysThisMonth.length} Mondays</strong>.
                {parsedAmount > 0 && (
                  <span className="block mt-1 font-semibold text-emerald-900 dark:text-emerald-200">
                    Total monthly deduction: {mondaysThisMonth.length} × {formatCurrency(parsedAmount)} = {formatCurrency(weeklyMonthlyTotal)}
                  </span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mondaysThisMonth.map((m) => (
                  <span
                    key={m.dateStr}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                      m.isPast
                        ? "bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 line-through"
                        : "bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold"
                    }`}
                  >
                    {m.dateStr.slice(5)} {m.isPast ? "(Passed)" : m.isToday ? "(Today)" : "(Upcoming)"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {frequency === "weekly" ? "Weekly Amount per Monday (₹)" : "Monthly Fixed Amount (₹)"}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={frequency === "weekly" ? "e.g. 250 (totals 1000 or 1250 / mo)" : "e.g. 15000"}
                className="w-full p-3 pl-8 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 rounded-xl outline-none text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white font-bold"
              />
            </div>
            {frequency === "weekly" && parsedAmount > 0 && (
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                Tip: A ₹250 weekly SIP triggers 4 times (₹1,000) or 5 times (₹1,250) depending on whether the month has 4 or 5 Mondays.
              </p>
            )}
          </div>

          {/* Bank Account (Deducted From) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Deduct From Bank Account (Accounts Tab)
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 rounded-xl outline-none text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="" disabled>Select Bank Account...</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              This amount will be subtracted from this bank account to show your exact "Remaining to Spend" balance.
            </p>
          </div>

          {/* Optional Category / Expense Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Category / Destination Account (Optional)
            </label>
            <select
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 rounded-xl outline-none text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">Auto / Standard Expense</option>
              {expenseAndAssetAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{initialCommitment ? "Update Commitment" : "Save Commitment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
