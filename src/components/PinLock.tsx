import React from 'react';
import { Lock, Sun, Moon } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const PinLock = ({ isDarkMode, toggleTheme }: { isDarkMode: boolean, toggleTheme: () => void }) => {
  const { login } = useFinance();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      alert("Failed to sign in with Google.");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <button 
        onClick={toggleTheme} 
        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors"
        title="Toggle Theme"
      >
        {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-gray-800 w-full max-w-sm text-center">
        <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-600 dark:text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">FinTrack Pro</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Sign in to sync your financial data securely across all your devices.</p>
        
        <button 
          onClick={handleLogin} 
          className="w-full bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-white p-4 rounded-xl font-bold transition-colors border border-slate-200 dark:border-gray-700 flex items-center justify-center gap-3 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
