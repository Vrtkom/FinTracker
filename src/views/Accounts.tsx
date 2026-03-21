import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Edit2, RefreshCw, Trash2, Target, Plus, Save } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getAccountBalance } from '../utils/finance';
import { AccountType, Liquidity, ExpenseType } from '../types';

export const Accounts = () => {
  const { accounts, setAccounts, transactions, goals, setGoals, setManagingPotsFor } = useFinance();
  
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('asset');
  const [newAccLiquidity, setNewAccLiquidity] = useState<Liquidity>('liquid');
  const [newAccExpenseType, setNewAccExpenseType] = useState<ExpenseType>('need');
  const [newAccBudget, setNewAccBudget] = useState('');
  const [newAccExcludeForecast, setNewAccExcludeForecast] = useState(false);

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalAccount, setNewGoalAccount] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  const editAcc = editingAccountId ? accounts.find(a => a.id === editingAccountId) : null;
  const formTitle = editAcc ? 'Edit Account' : 'New Account Name';

  useEffect(() => {
    if (editAcc) {
      setNewAccName(editAcc.name);
      setNewAccType(editAcc.type);
      setNewAccLiquidity(editAcc.liquidity || 'liquid');
      setNewAccExpenseType(editAcc.expenseType || 'need');
      setNewAccBudget(editAcc.budget ? String(editAcc.budget) : '');
      setNewAccExcludeForecast(editAcc.excludeFromForecast || false);
      nameInputRef.current?.focus();
    } else {
      setNewAccName('');
      setNewAccType('asset');
      setNewAccLiquidity('liquid');
      setNewAccExpenseType('need');
      setNewAccBudget('');
      setNewAccExcludeForecast(false);
    }
  }, [editAcc]);

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAccName.trim();
    if (!name) return;

    const budget = newAccType === 'expense' ? parseFloat(newAccBudget) || 0 : 0;
    const liquidity = newAccType === 'asset' ? newAccLiquidity : 'liquid';
    const expenseType = newAccType === 'expense' ? newAccExpenseType : 'need';
    const excludeFromForecast = newAccType === 'asset' ? newAccExcludeForecast : false;

    if (editingAccountId) {
      const updated = accounts.map(a => {
        if (a.id === editingAccountId) {
          return { ...a, name, type: newAccType, liquidity, expenseType, budget, excludeFromForecast };
        }
        return a;
      });
      setAccounts(updated);
      setEditingAccountId(null);
    } else {
      setAccounts([...accounts, { 
        id: Date.now().toString(), 
        name, 
        type: newAccType, 
        liquidity, 
        expenseType, 
        budget, 
        excludeFromForecast, 
        isArchived: false, 
        pots: [] 
      }]);
    }
  };

  const deleteAccount = (id: string) => {
    const isUsed = transactions.some(t => t.debitAccount === id || t.creditAccount === id);
    const isGoalLinked = goals.some(g => g.linkedAccountId === id);
    if (isUsed || isGoalLinked) {
      if (window.confirm("Cannot hard-delete: Account has entries or is linked to a goal.\nArchive it instead?")) {
        setAccounts(accounts.map(a => a.id === id ? { ...a, isArchived: true } : a));
      }
      return;
    }
    setAccounts(accounts.filter(a => a.id !== id));
  };

  const unarchiveAccount = (id: string) => {
    setAccounts(accounts.map(a => a.id === id ? { ...a, isArchived: false } : a));
  };

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGoalName.trim();
    const targetAmount = parseFloat(newGoalAmount);
    if (!name || isNaN(targetAmount) || !newGoalAccount) return;
    
    setGoals([...goals, { id: Date.now().toString(), name, targetAmount, linkedAccountId: newGoalAccount }]);
    setNewGoalName('');
    setNewGoalAmount('');
    setNewGoalAccount('');
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const inputClasses = "w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl outline-none transition-all text-sm md:text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500";

  const renderGroup = (type: AccountType, title: string, colorClass: string) => {
    const acts = accounts.filter(a => a.type === type);
    return (
      <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
        <h3 className={`text-base md:text-lg font-bold mb-4 flex items-center gap-2 ${colorClass}`}>{title}</h3>
        <div className="space-y-2 md:space-y-3">
          {acts.length > 0 ? acts.map(acc => (
            <div key={acc.id} className={`flex flex-col p-3.5 md:p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl group border border-slate-100 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600 transition-colors ${acc.isArchived ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm md:text-base font-medium text-slate-800 dark:text-gray-200 truncate pr-2">
                  {acc.name} 
                  {acc.isArchived && <span className="text-[10px] bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 px-1.5 py-0.5 rounded ml-1 uppercase">Archived</span>}
                  {acc.excludeFromForecast && <span className="ml-2 text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 rounded border border-indigo-100 dark:border-transparent">Stashed</span>}
                  {acc.type === 'expense' && <span className="ml-2 text-[10px] uppercase font-bold text-slate-400 dark:text-gray-500 bg-white dark:bg-gray-900 px-1.5 rounded">{acc.expenseType}</span>}
                  {acc.type === 'expense' && (acc.budget || 0) > 0 && <span className="ml-2 text-[10px] uppercase font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 rounded border border-orange-100 dark:border-transparent">Limit: {formatCurrency(acc.budget || 0)}</span>}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-900 dark:text-white text-sm md:text-base mr-1">{formatCurrency(getAccountBalance(acc.id, accounts, transactions))}</span>
                  {acc.type === 'asset' && (
                    <button onClick={() => setManagingPotsFor(acc.id)} title="Manage Pots" className="text-slate-400 hover:text-purple-500 dark:text-gray-500 dark:hover:text-purple-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setEditingAccountId(acc.id)} title="Edit Account" className="text-slate-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {acc.isArchived ? (
                    <button onClick={() => unarchiveAccount(acc.id)} title="Unarchive" className="text-slate-400 hover:text-emerald-500 dark:text-gray-500 dark:hover:text-emerald-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg transition-all">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => deleteAccount(acc.id)} title="Delete/Archive" className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 bg-white dark:bg-gray-800 border border-slate-200 dark:border-transparent p-1.5 md:p-2 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {acc.type === 'asset' && acc.liquidity === 'invested' && <p className="text-[11px] md:text-xs text-purple-600 dark:text-purple-400 mt-1">Invested</p>}
              {acc.type === 'asset' && acc.pots && acc.pots.length > 0 && (
                <>
                  <div className="mt-3 bg-slate-200 dark:bg-gray-700 h-1.5 rounded-full flex overflow-hidden">
                    {acc.pots.map(p => <div key={p.id} className="bg-blue-500 h-full border-r border-white dark:border-gray-800" style={{width: `${(p.amount/getAccountBalance(acc.id, accounts, transactions))*100}%`}} title={p.name}></div>)}
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-gray-400 mt-1">{acc.pots.length} Virtual Pot(s) Active</p>
                </>
              )}
            </div>
          )) : <p className="text-xs md:text-sm text-slate-400 dark:text-gray-500 italic p-3 md:p-4 border border-dashed border-slate-200 dark:border-gray-700 rounded-xl text-center">No accounts</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Accounts & Goals</h2>
      <form onSubmit={saveAccount} className={`bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 md:items-end flex-wrap transition-colors ${editAcc ? 'ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
        <div className="flex-1 w-full">
          <label className={`block text-xs md:text-sm font-bold ${editAcc ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-gray-400'} mb-1.5`}>{formTitle}</label>
          <input type="text" ref={nameInputRef} value={newAccName} onChange={e => setNewAccName(e.target.value)} className={inputClasses} placeholder="e.g. HDFC Bank, Swiggy" required />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Category</label>
          <select value={newAccType} onChange={e => setNewAccType(e.target.value as AccountType)} className={inputClasses}>
            <option value="asset">Asset (Bank/Cash)</option>
            <option value="liability">Liability (Card/Loan)</option>
            <option value="equity">Equity (Capital)</option>
            <option value="income">Income (Salary)</option>
            <option value="expense">Expense (Food/Rent)</option>
          </select>
        </div>
        {newAccType === 'asset' && (
          <div className="w-full md:w-36">
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Liquidity</label>
            <select value={newAccLiquidity} onChange={e => setNewAccLiquidity(e.target.value as Liquidity)} className={inputClasses}>
              <option value="liquid">Liquid</option>
              <option value="invested">Invested</option>
            </select>
          </div>
        )}
        {newAccType === 'expense' && (
          <>
            <div className="w-full md:w-36">
              <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Type (50/30/20)</label>
              <select value={newAccExpenseType} onChange={e => setNewAccExpenseType(e.target.value as ExpenseType)} className={inputClasses}>
                <option value="need">Need (50%)</option>
                <option value="want">Want (30%)</option>
              </select>
            </div>
            <div className="w-full md:w-36">
              <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Monthly Limit</label>
              <input type="number" value={newAccBudget} onChange={e => setNewAccBudget(e.target.value)} className={inputClasses} placeholder="Optional" />
            </div>
          </>
        )}
        {newAccType === 'asset' && (
          <div className="w-full mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-gray-400">
              <input type="checkbox" checked={newAccExcludeForecast} onChange={e => setNewAccExcludeForecast(e.target.checked)} className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 cursor-pointer accent-blue-600" />
              Exclude from Cash Flow Forecaster (Stash / Do Not Touch)
            </label>
          </div>
        )}
        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
          {editAcc && <button type="button" onClick={() => setEditingAccountId(null)} className="bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-800 dark:text-white px-5 py-3.5 rounded-xl font-bold transition-colors shadow-sm">Cancel</button>}
          <button type="submit" className="flex-1 md:flex-auto bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
            {editAcc ? <><Save className="w-5 h-5" /> Update</> : <><Plus className="w-5 h-5" /> Add</>}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {renderGroup('asset', 'Assets (Dr)', 'text-blue-600 dark:text-blue-400')}
        {renderGroup('liability', 'Liabilities (Cr)', 'text-red-600 dark:text-red-400')}
        {renderGroup('equity', 'Equity (Cr)', 'text-purple-600 dark:text-purple-400')}
        {renderGroup('income', 'Income (Cr)', 'text-emerald-600 dark:text-emerald-400')}
        {renderGroup('expense', 'Expenses (Dr)', 'text-orange-600 dark:text-orange-400')}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <Target className="w-6 h-6 text-purple-500" /> Financial Goals
        </h3>
        <form onSubmit={addGoal} className="flex flex-col md:flex-row gap-4 md:items-end flex-wrap border-b border-slate-100 dark:border-gray-800 pb-6 mb-6">
          <div className="flex-1 w-full">
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Goal Name</label>
            <input type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={inputClasses} placeholder="e.g. Goa Trip, New Car" required />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Target Amount</label>
            <input type="number" step="0.01" min="0" value={newGoalAmount} onChange={e => setNewGoalAmount(e.target.value)} className={inputClasses} placeholder="0.00" required />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Link to Asset Account</label>
            <select value={newGoalAccount} onChange={e => setNewGoalAccount(e.target.value)} className={inputClasses} required>
              <option value="" disabled>Select Asset...</option>
              {accounts.filter(a => !a.isArchived && a.type === 'asset').map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 dark:hover:bg-purple-500 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors mt-2 md:mt-0 shadow-lg shadow-purple-500/20">
            <Plus className="w-5 h-5" /> Set Goal
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.length > 0 ? goals.map(g => {
            const acc = accounts.find(a => a.id === g.linkedAccountId);
            return (
              <div key={g.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-700/50">
                <div>
                  <p className="font-bold text-slate-800 dark:text-gray-200">{g.name}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Target: {formatCurrency(g.targetAmount)} | Linked: {acc ? acc.name : 'Unknown'}</p>
                </div>
                <button onClick={() => deleteGoal(g.id)} className="text-red-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          }) : <p className="text-slate-400 dark:text-gray-500 text-sm italic">No goals defined yet.</p>}
        </div>
      </div>
    </div>
  );
};
