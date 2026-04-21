import React from "react";
import { Repeat, X, Trash2 } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import { formatCurrency } from "../../utils/finance";

export const ManageRecurringModal = () => {
  const {
    showManageRecurringModal,
    setShowManageRecurringModal,
    recurring,
    setRecurring,
    accounts,
  } = useFinance();

  if (!showManageRecurringModal) return null;

  const removeRecurring = (idx: number) => {
    const newRec = [...recurring];
    newRec.splice(idx, 1);
    setRecurring(newRec);
    if (newRec.length === 0) {
      setShowManageRecurringModal(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-500" /> Manage Recurring Flows
          </h2>
          <button
            onClick={() => setShowManageRecurringModal(false)}
            className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {recurring.length > 0 ? (
            <ul className="space-y-1">
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
                    className="text-sm py-3 flex justify-between items-center border-b border-slate-100 dark:border-gray-700/50 last:border-0"
                  >
                    <div>
                      <span className="text-slate-800 dark:text-gray-200 font-medium">
                        {r.description}
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                        Day {r.day || 1} of month
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold ${amountColor}`}>
                        {prefix}
                        {formatCurrency(r.amount)}
                      </span>
                      <button
                        onClick={() => removeRecurring(idx)}
                        className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1.5 rounded bg-slate-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-slate-500 dark:text-gray-400 py-8">
              No recurring templates saved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
