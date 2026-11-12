import React, { useState, useRef, useEffect } from "react";
import { Plus, BookOpen, Wallet, Target, Flag } from "lucide-react";
import { useFinance } from "../context/FinanceContext";

export const QuickAddButton = ({
  switchTab,
}: {
  switchTab: (tab: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setShowGlobalAddTx, setShowGlobalAddAccount, isAiDrawerOpen } = useFinance();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    setIsOpen(false);
    if (action === "transaction") {
      switchTab("transactions");
      setShowGlobalAddTx(true);
    } else if (action === "account") {
      switchTab("accounts");
      setShowGlobalAddAccount(true);
    } else if (action === "budget") {
      switchTab("budgets");
    } else if (action === "goal") {
      switchTab("budgets");
    }
  };

  // Do not render Quick Add floating button when AI assistant drawer is open to prevent overlapping controls
  if (isAiDrawerOpen) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40"
      ref={menuRef}
    >
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 p-2 w-48 flex flex-col gap-1 mb-2 animate-in slide-in-from-bottom-2">
          <button
            onClick={() => handleAction("transaction")}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
          >
            <BookOpen className="w-4 h-4 text-blue-500" /> Transaction
          </button>
          <button
            onClick={() => handleAction("account")}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
          >
            <Wallet className="w-4 h-4 text-emerald-500" /> Account
          </button>
          <button
            onClick={() => handleAction("budget")}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
          >
            <Target className="w-4 h-4 text-orange-500" /> Budget
          </button>
          <button
            onClick={() => handleAction("goal")}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
          >
            <Flag className="w-4 h-4 text-purple-500" /> Goal
          </button>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        title="Quick Add"
      >
        <Plus
          className={`w-6 h-6 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
        />
      </button>
    </div>
  );
};
