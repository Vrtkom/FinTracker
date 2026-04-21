import React from "react";
import { CalendarClock, CheckCircle, X } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import { formatCurrency } from "../../utils/finance";

export const RecurringModal = () => {
  const {
    showRecurringModal,
    setShowRecurringModal,
    recurring,
    setRecurring,
    accounts,
    transactions,
    setTransactions,
  } = useFinance();

  if (!showRecurringModal) return null;

  const postRecurring = () => {
    const today = new Date().toISOString().split("T")[0];
    const newTxs = recurring.map((r, i) => ({
      id: Date.now().toString() + i,
      date: today,
      description: r.description,
      amount: r.amount,
      debitAccount: r.debitAccount,
      creditAccount: r.creditAccount,
      cleared: true,
      receipt: null,
    }));

    setTransactions([...transactions, ...newTxs]);
    localStorage.setItem(
      "fintrack_last_checkin",
      new Date().toISOString().slice(0, 7),
    );
    setShowRecurringModal(false);
  };

  const skipRecurring = () => {
    localStorage.setItem(
      "fintrack_last_checkin",
      new Date().toISOString().slice(0, 7),
    );
    setShowRecurringModal(false);
  };

  const removeRecurring = (idx: number) => {
    const newRec = [...recurring];
    newRec.splice(idx, 1);
    setRecurring(newRec);
    if (newRec.length === 0) {
      setShowRecurringModal(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-gray-800">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
              <CalendarClock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                New Month Check-in
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {new Date().toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-gray-300 mb-4 text-sm md:text-base">
            Would you like to automatically post your saved monthly recurring
            entries?
          </p>
          <ul className="mb-6 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-100 dark:border-gray-700/50 max-h-48 overflow-y-auto">
            {recurring.map((r, idx) => {
              const crAcc = accounts.find((a) => a.id === r.creditAccount);
              const isIncome = crAcc && crAcc.type === "income";
              const amountColor = isIncome
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-900 dark:text-white";
              const prefix = isIncome ? "+" : "-";
              return (
                <li
                  key={idx}
                  className="text-sm py-2 flex justify-between items-center border-b border-slate-100 dark:border-gray-700/50 last:border-0"
                >
                  <span className="text-slate-800 dark:text-gray-200">
                    {r.description}{" "}
                    <span className={`font-bold ${amountColor} ml-2`}>
                      {prefix}
                      {formatCurrency(r.amount)}
                    </span>
                  </span>
                  <button
                    onClick={() => removeRecurring(idx)}
                    className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={postRecurring}
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" /> Post All
            </button>
            <button
              onClick={skipRecurring}
              className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-800 dark:text-white py-3 rounded-xl font-bold transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
