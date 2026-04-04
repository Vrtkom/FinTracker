import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getAccountBalance } from '../utils/finance';
import { Target, Plus, Trash2, AlertCircle, ArrowRight, PiggyBank, Home, Car, Plane, GraduationCap, Heart, Laptop, Smartphone, Baby, Gift } from 'lucide-react';

export const Budgets = ({ switchTab }: { switchTab: (tab: string) => void }) => {
  const { budgets, setBudgets, transactions, setJournalFilterSearch, setJournalFilterAccount, setJournalFilterDate, setGlobalAddTxDefaults, goals, setGoals, accounts } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalAccount, setNewGoalAccount] = useState('');

  const currentMonthTxs = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [transactions]);

  const budgetProgress = useMemo(() => {
    return budgets.map(budget => {
      const spent = currentMonthTxs.reduce((sum, tx) => {
        if (tx.tags && tx.tags.includes(budget.tag)) {
          return sum + tx.amount;
        }
        return sum;
      }, 0);
      return { ...budget, spent };
    });
  }, [budgets, currentMonthTxs]);

  const handleAddBudget = () => {
    if (!newTag || !newLimit) return;
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit <= 0) return;

    const newBudget = {
      id: Date.now().toString(),
      tag: newTag.trim(),
      limit,
      period: 'monthly' as const
    };

    setBudgets([...budgets, newBudget]);
    setNewTag('');
    setNewLimit('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setBudgets(budgets.filter(b => b.id !== id));
  };

  const handleBudgetClick = (tag: string) => {
    setJournalFilterSearch(`#${tag}`);
    setJournalFilterAccount('');
    setJournalFilterDate('all');
    switchTab('transactions');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-rose-100 dark:bg-rose-900/30 p-3 rounded-2xl">
            <Target className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Budgets & Goals</h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm">Monthly limits by category tags</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Budget
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add New Budget</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Tag (e.g. food)</label>
              <input 
                type="text" 
                value={newTag} 
                onChange={e => setNewTag(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="food"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Monthly Limit (₹)</label>
              <input 
                type="number" 
                value={newLimit} 
                onChange={e => setNewLimit(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="5000"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleAddBudget}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors"
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgetProgress.map(b => {
          const percent = Math.min(100, (b.spent / b.limit) * 100);
          const isOver = b.spent > b.limit;
          const isWarning = percent > 80 && !isOver;
          
          let barColor = 'bg-emerald-500';
          if (isOver) barColor = 'bg-rose-500';
          else if (isWarning) barColor = 'bg-amber-500';

          return (
            <div 
              key={b.id} 
              onClick={() => handleBudgetClick(b.tag)}
              onMouseEnter={() => setGlobalAddTxDefaults({ tags: b.tag })}
              onTouchStart={() => setGlobalAddTxDefaults({ tags: b.tag })}
              className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm relative group cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center gap-1">
                    #{b.tag}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(b.spent)}</h3>
                </div>
                <div className="text-right">
                  <span className="text-sm text-slate-500 dark:text-gray-400">of {formatCurrency(b.limit)}</span>
                </div>
              </div>
              
              <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-3 mb-2 overflow-hidden">
                <div className={`h-3 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className={isOver ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-gray-400'}>
                  {percent.toFixed(1)}% used
                </span>
                {isOver && (
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <AlertCircle className="w-3 h-3" /> Over budget by {formatCurrency(b.spent - b.limit)}
                  </span>
                )}
                {isWarning && (
                  <span className="text-amber-500 font-bold">
                    Approaching limit
                  </span>
                )}
                {!isOver && !isWarning && (
                  <span className="text-emerald-500 font-bold">
                    {formatCurrency(b.limit - b.spent)} left
                  </span>
                )}
              </div>
            </div>
          );
        })}
        
        {budgets.length === 0 && !isAdding && (
          <div className="col-span-full bg-slate-50 dark:bg-gray-800/50 border border-dashed border-slate-300 dark:border-gray-700 rounded-3xl p-12 text-center">
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-gray-300 mb-2">No budgets set</h3>
            <p className="text-slate-500 dark:text-gray-400 mb-6 max-w-md mx-auto">Create budgets for specific tags to track your spending and stay within your limits.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
            >
              Create First Budget
            </button>
          </div>
        )}
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
            const bal = acc ? getAccountBalance(acc.id, accounts, transactions) : 0;
            const pct = Math.min(100, Math.max(0, (bal / g.targetAmount) * 100));

            const lowerName = g.name.toLowerCase();
            let GoalIcon = PiggyBank;
            if (lowerName.includes('house') || lowerName.includes('home') || lowerName.includes('down payment') || lowerName.includes('mortgage')) GoalIcon = Home;
            else if (lowerName.includes('car') || lowerName.includes('auto') || lowerName.includes('vehicle')) GoalIcon = Car;
            else if (lowerName.includes('vacation') || lowerName.includes('trip') || lowerName.includes('travel') || lowerName.includes('flight')) GoalIcon = Plane;
            else if (lowerName.includes('education') || lowerName.includes('college') || lowerName.includes('school') || lowerName.includes('tuition')) GoalIcon = GraduationCap;
            else if (lowerName.includes('wedding') || lowerName.includes('health') || lowerName.includes('medical')) GoalIcon = Heart;
            else if (lowerName.includes('laptop') || lowerName.includes('computer') || lowerName.includes('pc')) GoalIcon = Laptop;
            else if (lowerName.includes('phone') || lowerName.includes('mobile')) GoalIcon = Smartphone;
            else if (lowerName.includes('baby') || lowerName.includes('child')) GoalIcon = Baby;
            else if (lowerName.includes('gift') || lowerName.includes('present')) GoalIcon = Gift;

            return (
              <div key={g.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full shadow-sm border border-slate-200 dark:border-gray-700 shrink-0">
                    <GoalIcon className="w-6 h-6 text-slate-300 dark:text-gray-600 absolute" />
                    <div 
                      className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full"
                      style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}
                    >
                      <GoalIcon className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-gray-200">{g.name}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Target: {formatCurrency(g.targetAmount)} | Linked: {acc ? acc.name : 'Unknown'}</p>
                  </div>
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
