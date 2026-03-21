import React, { useState, useEffect } from 'react';
import { 
  Landmark, LayoutDashboard, Wallet, BookOpen, PieChart, 
  Download, Upload, Trash2, Repeat, LogOut, Eye, EyeOff, AlertTriangle, Sun, Moon
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { getTotals } from '../utils/finance';

const tabs = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', short: 'Home' },
  { id: 'accounts', icon: Wallet, label: 'Accounts & Goals', short: 'Accounts' },
  { id: 'transactions', icon: BookOpen, label: 'Journal Entries', short: 'Journal' },
  { id: 'reports', icon: PieChart, label: 'Statements & Insights', short: 'Reports' },
];

export const Layout = ({ children, activeTab, setActiveTab, isDarkMode, toggleTheme }: { children: React.ReactNode, activeTab: string, setActiveTab: (t: string) => void, isDarkMode: boolean, toggleTheme: () => void }) => {
  const { 
    user, logoutUser,
    hideBalances, setHideBalances, 
    setShowManageRecurringModal, 
    accounts, transactions, 
    setAccounts, setTransactions, setRecurring, setGoals,
    clearAllData 
  } = useFinance();
  
  const [hasImbalance, setHasImbalance] = useState(false);

  useEffect(() => {
    const totals = getTotals(accounts, transactions);
    const imbalance = totals.assets - (totals.liabilities + totals.equity + totals.income - totals.expenses);
    setHasImbalance(Math.abs(imbalance) > 0.01 && transactions.length > 0);
  }, [accounts, transactions]);

  const toggleHideBalances = () => {
    setHideBalances(!hideBalances);
    localStorage.setItem('fintrack_hide_balances', String(!hideBalances));
  };

  const exportData = () => {
    const backup = { 
      accounts, 
      transactions, 
      recurring: JSON.parse(localStorage.getItem('fintrack_recurring_fallback') || '[]'), 
      goals: JSON.parse(localStorage.getItem('fintrack_goals_fallback') || '[]'),
      exportDate: new Date().toISOString() 
    };
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        if (backup.accounts && backup.transactions) {
          setAccounts(backup.accounts);
          setTransactions(backup.transactions);
          if (backup.recurring) setRecurring(backup.recurring);
          if (backup.goals) setGoals(backup.goals);
          alert("Data successfully restored from Backup!");
        } else alert("Invalid backup file format.");
      } catch (err) { 
        alert("Error reading backup file."); 
      }
      event.target.value = ''; 
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm("DANGER ZONE\n\nAre you absolutely sure you want to clear all data? This cannot be undone unless you have a backup file.")) {
      if (window.confirm("Last chance. Type 'YES' to delete all data.")) {
        clearAllData();
        alert("All data wiped clean.");
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 p-4 flex justify-between items-center shrink-0 z-20 transition-colors duration-200">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">FinTrack Pro</h1>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 items-center">
          <button onClick={toggleTheme} className="text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white p-1" title="Toggle Theme">
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={toggleHideBalances} className="text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white p-1">
            {hideBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <button onClick={() => document.getElementById('importFile')?.click()} className="text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white p-1">
            <Upload className="w-5 h-5" />
          </button>
          <button onClick={exportData} className="text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white p-1">
            <Download className="w-5 h-5" />
          </button>
          <input type="file" id="importFile" className="hidden" accept=".json" onChange={importData} />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-white dark:bg-gray-900 flex-col h-full shrink-0 border-r border-slate-200 dark:border-gray-800 shadow-xl z-10 justify-between transition-colors duration-200 overflow-y-auto">
        <div>
          <div className="p-6 flex flex-col gap-2 border-b border-slate-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Landmark className="w-8 h-8 text-blue-600 dark:text-blue-500" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">FinTrack</h1>
              </div>
              <div className="flex gap-1">
                <button onClick={toggleTheme} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1.5" title="Toggle Theme">
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button onClick={toggleHideBalances} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1.5">
                  {hideBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-500 pl-11">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div></div> Cloud Synced
            </div>
          </div>
          <nav className="py-6 space-y-2 px-4">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 dark:shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'}`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-5 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 transition-colors duration-200 shrink-0">
          <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3">Data Management</p>
          <div className="space-y-2">
            <button onClick={exportData} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 rounded-xl transition-colors">
              <Download className="w-4 h-4" /> Export Backup
            </button>
            <button onClick={() => document.getElementById('importFile')?.click()} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 rounded-xl transition-colors">
              <Upload className="w-4 h-4" /> Restore Data
            </button>
            <button onClick={handleClearData} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded-xl transition-colors mt-4">
              <Trash2 className="w-4 h-4" /> Clear All Data
            </button>
          </div>
          
          <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-3 mt-6">Account</p>
          <div className="space-y-2">
            <button onClick={() => setShowManageRecurringModal(true)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-xl transition-colors mb-2">
              <Repeat className="w-4 h-4" /> Manage Recurring
            </button>
            
            <div className="w-full flex flex-col gap-2 px-4 py-3 text-sm font-medium text-slate-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl transition-colors">
              <div className="flex items-center gap-2 truncate">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="truncate text-xs">{user?.email}</span>
              </div>
              <button onClick={logoutUser} className="w-full flex items-center justify-center gap-2 py-1.5 mt-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8 relative" id="scroll-container">
        {hasImbalance && (
          <div className="max-w-6xl mx-auto mb-6 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-500 text-red-800 dark:text-red-200 px-4 py-3 md:px-6 md:py-4 rounded-xl flex items-center gap-4 shadow-lg">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-bold text-sm md:text-base">Accounting Imbalance</h4>
              <p className="text-xs md:text-sm opacity-80">Assets do not equal Liabilities + Equity + Net Income.</p>
            </div>
          </div>
        )}
        
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800 flex justify-around items-center shrink-0 z-30 fixed bottom-0 w-full pb-safe transition-colors duration-200">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
          >
            <tab.icon className={`w-6 h-6 mb-1 ${activeTab === tab.id ? 'fill-blue-100 dark:fill-blue-500/20' : ''}`} />
            <span className="text-[10px] font-medium tracking-wide">{tab.short}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
