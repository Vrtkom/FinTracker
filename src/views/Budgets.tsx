import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getAccountBalance } from '../utils/finance';
import { Target, Plus, Trash2, AlertCircle, ArrowRight, PiggyBank, Home, Car, Plane, GraduationCap, Heart, Laptop, Smartphone, Baby, Gift, X, Wallet, Edit2 } from 'lucide-react';

export const Budgets = ({ switchTab }: { switchTab: (tab: string) => void }) => {
  const { budgets, setBudgets, transactions, setJournalFilterSearch, setJournalFilterAccount, setJournalFilterDate, setGlobalAddTxDefaults, goals, setGoals, accounts, funds, setFunds } = useFinance();
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals' | 'funds'>('budgets');
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isAddingFund, setIsAddingFund] = useState(false);
  const [newBudgetType, setNewBudgetType] = useState<'tag' | 'account'>('tag');
  const [newTag, setNewTag] = useState('');
  const [newBudgetAccount, setNewBudgetAccount] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalAccount, setNewGoalAccount] = useState('');

  const [newFundName, setNewFundName] = useState('');
  const [newFundBalance, setNewFundBalance] = useState('');
  const [newFundTarget, setNewFundTarget] = useState('');

  const [editingFund, setEditingFund] = useState<any>(null);
  const [editFundName, setEditFundName] = useState('');
  const [editFundBalance, setEditFundBalance] = useState('');
  const [editFundTarget, setEditFundTarget] = useState('');

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
        if (budget.accountId) {
          if (tx.debitAccount === budget.accountId) {
            return sum + tx.amount;
          }
        } else if (budget.tag && tx.tags && tx.tags.includes(budget.tag)) {
          return sum + tx.amount;
        }
        return sum;
      }, 0);
      return { ...budget, spent };
    });
  }, [budgets, currentMonthTxs]);

  const handleAddBudget = () => {
    if (newBudgetType === 'tag' && !newTag) return;
    if (newBudgetType === 'account' && !newBudgetAccount) return;
    if (!newLimit) return;
    const limit = parseFloat(newLimit);
    if (isNaN(limit) || limit <= 0) return;

    const newBudget = {
      id: Date.now().toString(),
      tag: newBudgetType === 'tag' ? newTag.trim() : undefined,
      accountId: newBudgetType === 'account' ? newBudgetAccount : undefined,
      limit,
      period: 'monthly' as const
    };

    setBudgets([...budgets, newBudget]);
    setNewTag('');
    setNewBudgetAccount('');
    setNewLimit('');
    setIsAddingBudget(false);
  };

  const handleDelete = (id: string) => {
    setBudgets(budgets.filter(b => b.id !== id));
  };

  const handleBudgetClick = (budget: any) => {
    if (budget.accountId) {
      setJournalFilterAccount(budget.accountId);
      setJournalFilterSearch('');
    } else if (budget.tag) {
      setJournalFilterSearch(`#${budget.tag}`);
      setJournalFilterAccount('');
    }
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
    setIsAddingGoal(false);
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const addFund = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFundName.trim();
    const balance = parseFloat(newFundBalance);
    const target = newFundTarget ? parseFloat(newFundTarget) : undefined;
    
    if (!name || isNaN(balance)) return;
    
    setFunds([...funds, { id: Date.now().toString(), name, balance, target }]);
    setNewFundName('');
    setNewFundBalance('');
    setNewFundTarget('');
    setIsAddingFund(false);
  };

  const deleteFund = (id: string) => {
    setFunds(funds.filter(f => f.id !== id));
  };

  const startEditFund = (f: any) => {
    setEditingFund(f);
    setEditFundName(f.name);
    setEditFundBalance(f.balance.toString());
    setEditFundTarget(f.target ? f.target.toString() : '');
  };

  const saveEditFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFund) return;
    const name = editFundName.trim();
    const balance = parseFloat(editFundBalance);
    const target = editFundTarget ? parseFloat(editFundTarget) : undefined;
    
    if (!name || isNaN(balance)) return;
    
    setFunds(funds.map(f => f.id === editingFund.id ? { ...f, name, balance, target } : f));
    setEditingFund(null);
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
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Planning</h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm">Manage your budgets and financial goals</p>
          </div>
        </div>
        {activeTab === 'budgets' && (budgetProgress.length > 0 || isAddingBudget) && (
          <button 
            onClick={() => setIsAddingBudget(!isAddingBudget)}
            className="bg-slate-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
          >
            {isAddingBudget ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingBudget ? 'Cancel' : 'New Budget'}
          </button>
        )}
        {activeTab === 'goals' && (goals.length > 0 || isAddingGoal) && (
          <button 
            onClick={() => setIsAddingGoal(!isAddingGoal)}
            className="bg-slate-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
          >
            {isAddingGoal ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingGoal ? 'Cancel' : 'New Goal'}
          </button>
        )}
        {activeTab === 'funds' && (funds.length > 0 || isAddingFund) && (
          <button 
            onClick={() => setIsAddingFund(!isAddingFund)}
            className="bg-slate-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors"
          >
            {isAddingFund ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingFund ? 'Cancel' : 'New Fund'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-800 pb-4 mb-6">
        <button 
          onClick={() => setActiveTab('budgets')}
          className={`text-sm md:text-base font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 ${activeTab === 'budgets' ? 'bg-slate-900 text-white dark:bg-white dark:text-gray-900 shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
        >
          <Target className="w-4 h-4" /> Budgets
        </button>
        <button 
          onClick={() => setActiveTab('goals')}
          className={`text-sm md:text-base font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 ${activeTab === 'goals' ? 'bg-slate-900 text-white dark:bg-white dark:text-gray-900 shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
        >
          <PiggyBank className="w-4 h-4" /> Financial Goals
        </button>
        <button 
          onClick={() => setActiveTab('funds')}
          className={`text-sm md:text-base font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 ${activeTab === 'funds' ? 'bg-slate-900 text-white dark:bg-white dark:text-gray-900 shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
        >
          <Wallet className="w-4 h-4" /> Funds
        </button>
      </div>

      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {isAddingBudget && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm mb-6 animate-in slide-in-from-top-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add New Budget</h3>
              <div className="mb-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                    <input type="radio" checked={newBudgetType === 'tag'} onChange={() => setNewBudgetType('tag')} className="accent-blue-600" />
                    By Tag
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                    <input type="radio" checked={newBudgetType === 'account'} onChange={() => setNewBudgetType('account')} className="accent-blue-600" />
                    By Account
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  {newBudgetType === 'tag' ? (
                    <>
                      <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Tag (e.g. food)</label>
                      <input 
                        type="text" 
                        value={newTag} 
                        onChange={e => setNewTag(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="food"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Account</label>
                      <select 
                        value={newBudgetAccount} 
                        onChange={e => setNewBudgetAccount(e.target.value)} 
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Account</option>
                        {accounts.filter(a => a.type === 'expense').map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </>
                  )}
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

          {budgetProgress.length === 0 && !isAddingBudget && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Budgets Yet</h3>
              <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">
                Create budgets to track your spending against specific tags (like #food or #travel). We'll automatically track your progress based on your transactions.
              </p>
              <button 
                onClick={() => setIsAddingBudget(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
              >
                Create Your First Budget
              </button>
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
              onClick={() => handleBudgetClick(b)}
              onMouseEnter={() => setGlobalAddTxDefaults(b.accountId ? { debitAccount: b.accountId } : { tags: b.tag })}
              onTouchStart={() => setGlobalAddTxDefaults(b.accountId ? { debitAccount: b.accountId } : { tags: b.tag })}
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
                    {b.accountId ? accounts.find(a => a.id === b.accountId)?.name || 'Unknown Account' : `#${b.tag}`}
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
        
      </div>
      </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-6">
          {isAddingGoal && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm animate-in slide-in-from-top-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add New Goal</h3>
              <form onSubmit={addGoal} className="flex flex-col md:flex-row gap-4 md:items-end flex-wrap">
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
            </div>
          )}

          {goals.length === 0 && !isAddingGoal && (
            <div className="col-span-full bg-white dark:bg-gray-900 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Goals Yet</h3>
              <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">
                Set financial goals like saving for a house, car, or vacation. Link them to an asset account to track your progress automatically.
              </p>
              <button 
                onClick={() => setIsAddingGoal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-purple-500/20"
              >
                Create Your First Goal
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(g => {
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
                <div key={g.id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-gray-800 rounded-full shrink-0">
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
                  <button onClick={() => deleteGoal(g.id)} className="text-slate-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'funds' && (
        <div className="space-y-6">
          {isAddingFund && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm animate-in slide-in-from-top-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add New Fund</h3>
              <form onSubmit={addFund} className="flex flex-col md:flex-row gap-4 md:items-end flex-wrap">
                <div className="flex-1 w-full">
                  <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Fund Name</label>
                  <input type="text" value={newFundName} onChange={e => setNewFundName(e.target.value)} className={inputClasses} placeholder="e.g. Emergency Fund, Taxes" required />
                </div>
                <div className="w-full md:w-48">
                  <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Current Balance</label>
                  <input type="number" step="0.01" min="0" value={newFundBalance} onChange={e => setNewFundBalance(e.target.value)} className={inputClasses} placeholder="0.00" required />
                </div>
                <div className="w-full md:w-48">
                  <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Target Amount (Optional)</label>
                  <input type="number" step="0.01" min="0" value={newFundTarget} onChange={e => setNewFundTarget(e.target.value)} className={inputClasses} placeholder="0.00" />
                </div>
                <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors mt-2 md:mt-0 shadow-lg shadow-blue-500/20">
                  <Plus className="w-5 h-5" /> Add Fund
                </button>
              </form>
            </div>
          )}

          {funds.length === 0 && !isAddingFund && (
            <div className="col-span-full bg-white dark:bg-gray-900 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Funds Yet</h3>
              <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">
                Allocate money into specific funds (like Emergency Fund or Taxes) to separate it from your spendable balance.
              </p>
              <button 
                onClick={() => setIsAddingFund(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
              >
                Create Your First Fund
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funds.map(f => {
              const pct = f.target ? Math.min(100, Math.max(0, (f.balance / f.target) * 100)) : 0;

              return (
                <div key={f.id} className="flex flex-col p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-gray-200">{f.name}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          {f.target ? `Target: ${formatCurrency(f.target)}` : 'No target set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditFund(f)} className="text-slate-400 hover:text-blue-500 p-1"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteFund(f.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(f.balance)}</p>
                    {f.target && (
                      <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-2 mt-2 overflow-hidden">
                        <div className="h-2 rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {editingFund && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-blue-500" />
                    Edit Fund
                  </h2>
                  <button onClick={() => setEditingFund(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={saveEditFund} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Fund Name</label>
                    <input type="text" value={editFundName} onChange={e => setEditFundName(e.target.value)} className={inputClasses} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Current Balance</label>
                    <input type="number" step="0.01" min="0" value={editFundBalance} onChange={e => setEditFundBalance(e.target.value)} className={inputClasses} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Target Amount (Optional)</label>
                    <input type="number" step="0.01" min="0" value={editFundTarget} onChange={e => setEditFundTarget(e.target.value)} className={inputClasses} />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-colors mt-4">
                    Save Changes
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
