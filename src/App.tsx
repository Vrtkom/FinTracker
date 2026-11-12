/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { FinanceProvider, useFinance } from "./context/FinanceContext";
import { Layout } from "./components/Layout";
import { PinLock } from "./components/PinLock";
import { Dashboard } from "./views/Dashboard";
import { Accounts } from "./views/Accounts";
import { Journal } from "./views/Journal";
import { Analytics } from "./views/Analytics";
import { Budgets } from "./views/Budgets";
import { Portfolio } from "./views/Portfolio";
import { QuickAddButton } from "./components/QuickAddButton";
import { RecurringModal } from "./components/Modals/RecurringModal";
import { ManageRecurringModal } from "./components/Modals/ManageRecurringModal";
import { VirtualPotsModal } from "./components/Modals/VirtualPotsModal";
import { ReceiptModal } from "./components/Modals/ReceiptModal";
import { AiAssistantDrawer } from "./components/AiAssistantDrawer";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";

const AppContent = () => {
  const { user, migrateLocalData, setShowGlobalAddTx, setGlobalAddTxDefaults } =
    useFinance();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState<"light" | "dark" | "neon">(() => {
    const saved = localStorage.getItem("fintrack_theme");
    return (saved as "light" | "dark" | "neon") || "dark";
  });
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      const hasLocalData =
        !!localStorage.getItem("fintrack_accounts") ||
        !!localStorage.getItem("fintrack_transactions");
      if (hasLocalData) {
        setShowMigrationPrompt(true);
      }
    }
  }, [user]);

  const handleMigrate = async () => {
    await migrateLocalData();
    setShowMigrationPrompt(false);
  };

  const handleDismissMigration = () => {
    setShowDismissConfirm(true);
  };

  const confirmDismissMigration = () => {
    setShowMigrationPrompt(false);
    setShowDismissConfirm(false);
    // Set a flag to prevent prompting again instead of deleting data
    localStorage.setItem("fintrack_migration_dismissed", "true");
  };

  useEffect(() => {
    // Clear predictive defaults when navigating away
    if (activeTab !== "transactions") {
      setGlobalAddTxDefaults?.(null);
    }
  }, [activeTab, setGlobalAddTxDefaults]);

  React.useEffect(() => {
    document.documentElement.classList.remove("dark", "theme-neon");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "neon") {
      document.documentElement.classList.add("dark", "theme-neon");
    }
    localStorage.setItem("fintrack_theme", theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) =>
      prev === "light" ? "dark" : prev === "dark" ? "neon" : "light",
    );
  };

  if (!user) {
    return <PinLock theme={theme} cycleTheme={cycleTheme} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      theme={theme}
      cycleTheme={cycleTheme}
    >
      {showMigrationPrompt && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
              Local Data Found
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              We found existing financial data on this device. Would you like to
              migrate it to your cloud account?
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={handleDismissMigration}
              className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleMigrate}
              className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Migrate Data
            </button>
          </div>
        </div>
      )}

      {activeTab === "dashboard" && <Dashboard switchTab={setActiveTab} />}
      {activeTab === "accounts" && <Accounts switchTab={setActiveTab} />}
      {activeTab === "portfolio" && <Portfolio />}
      {activeTab === "transactions" && <Journal switchTab={setActiveTab} />}
      {activeTab === "budgets" && <Budgets switchTab={setActiveTab} />}
      {activeTab === "analytics" && <Analytics switchTab={setActiveTab} />}

      <RecurringModal />
      <ManageRecurringModal />
      <VirtualPotsModal />
      <ReceiptModal />
      <AiAssistantDrawer />

      <QuickAddButton switchTab={setActiveTab} />

      {/* Dismiss Migration Confirmation Modal */}
      {showDismissConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              Dismiss Migration?
            </h3>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              Are you sure? Your local data will remain on this device but won't
              be synced to the cloud. You can clear it later in Data Management.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDismissConfirm(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDismissMigration}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
      <Toaster position="bottom-center" theme="system" />
    </FinanceProvider>
  );
}
