/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Layout } from './components/Layout';
import { PinLock } from './components/PinLock';
import { Dashboard } from './views/Dashboard';
import { Accounts } from './views/Accounts';
import { Journal } from './views/Journal';
import { Reports } from './views/Reports';
import { Budgets } from './views/Budgets';
import { Insights } from './views/Insights';
import { RecurringModal } from './components/Modals/RecurringModal';
import { ManageRecurringModal } from './components/Modals/ManageRecurringModal';
import { VirtualPotsModal } from './components/Modals/VirtualPotsModal';
import { ReceiptModal } from './components/Modals/ReceiptModal';

const AppContent = () => {
  const { user, migrateLocalData } = useFinance();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('fintrack_theme');
    return saved ? saved === 'dark' : true;
  });
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

  useEffect(() => {
    if (user) {
      const hasLocalData = !!localStorage.getItem('fintrack_accounts') || !!localStorage.getItem('fintrack_transactions');
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
    if (window.confirm("Are you sure? Your local data will remain on this device but won't be synced to the cloud. You can clear it later in Data Management.")) {
      setShowMigrationPrompt(false);
      // Set a flag to prevent prompting again instead of deleting data
      localStorage.setItem('fintrack_migration_dismissed', 'true');
    }
  };

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fintrack_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fintrack_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (!user) {
    return <PinLock isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
      {showMigrationPrompt && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">Local Data Found</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">We found existing financial data on this device. Would you like to migrate it to your cloud account?</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleDismissMigration} className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
              Dismiss
            </button>
            <button onClick={handleMigrate} className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Migrate Data
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'dashboard' && <Dashboard switchTab={setActiveTab} />}
      {activeTab === 'accounts' && <Accounts />}
      {activeTab === 'transactions' && <Journal />}
      {activeTab === 'budgets' && <Budgets />}
      {activeTab === 'insights' && <Insights switchTab={setActiveTab} />}
      {activeTab === 'reports' && <Reports />}
      
      <RecurringModal />
      <ManageRecurringModal />
      <VirtualPotsModal />
      <ReceiptModal />
    </Layout>
  );
};

import { Toaster } from 'sonner';

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
      <Toaster position="bottom-center" theme="system" />
    </FinanceProvider>
  );
}

