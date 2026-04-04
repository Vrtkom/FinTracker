import React, { useMemo, useState } from 'react';
import { Coffee, Coins, Lock, CreditCard, Wallet, CalendarDays, Activity, LayoutGrid, Trophy, Repeat, Target, Paperclip, X, Home, Car, Plane, GraduationCap, Heart, PiggyBank, Laptop, Smartphone, Baby, Gift } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getTotals, getAverages, getGamificationStreaks, getAccountBalance } from '../utils/finance';
import { TransactionSlideOver } from '../components/TransactionSlideOver';

export const Dashboard = ({ switchTab }: { switchTab: (tab: string) => void }) => {
  const { accounts, transactions, recurring, goals, hideBalances, setHideBalances } = useFinance();
  const [slideOverTxId, setSlideOverTxId] = useState<string | null>(null);

  const totals = useMemo(() => getTotals(accounts, transactions), [accounts, transactions]);
  const avgs = useMemo(() => getAverages(accounts, transactions), [accounts, transactions]);
  const streaks = useMemo(() => getGamificationStreaks(accounts, transactions), [accounts, transactions]);
  
  const runwayMonths = avgs.avgNeeds > 0 ? (totals.liquidAssets / avgs.avgNeeds).toFixed(1) : '∞';
  const todayStr = new Date().toISOString().split('T')[0];
  const recentTxs = [...transactions].slice(-4).reverse();
  
  const blurClass = hideBalances ? 'blur-[6px] opacity-50 select-none cursor-pointer' : 'cursor-pointer transition-all duration-300';
  const toggleHideBalances = () => setHideBalances(!hideBalances);

  const [selectedDay, setSelectedDay] = useState<any>(null);

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  
  let curIncome = 0;
  let curExpenses = 0;
  const expMap: Record<string, number> = {};
  const accSpent: Record<string, number> = {}; 

  transactions.forEach(t => {
    if (t.date > todayStr) return;
    const d = new Date(t.date);
    if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
      const crAcc = accounts.find(a => a.id === t.creditAccount);
      if (crAcc && crAcc.type === 'income') curIncome += t.amount;

      const drAcc = accounts.find(a => a.id === t.debitAccount);
      if (drAcc && drAcc.type === 'expense') {
        expMap[drAcc.name] = (expMap[drAcc.name] || 0) + t.amount;
        accSpent[drAcc.id] = (accSpent[drAcc.id] || 0) + t.amount;
        curExpenses += t.amount;
      }
    }
  });

  let recurringIncomeTotal = 0;
  let recurringExpenseTotal = 0;
  
  recurring.forEach(r => {
    const crAcc = accounts.find(a => a.id === r.creditAccount);
    if (crAcc && crAcc.type === 'income') recurringIncomeTotal += r.amount;
    else recurringExpenseTotal += r.amount;
  });

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayDate = now.getDate();
  const daysLeft = daysInMonth - todayDate + 1;
  
  let totalBudget = 0;
  let spentInBudgets = 0;
  accounts.forEach(a => {
    if (a.type === 'expense' && (a.budget || 0) > 0) {
      totalBudget += (a.budget || 0);
      spentInBudgets += (accSpent[a.id] || 0);
    }
  });

  let safeToSpend = 0;
  let allowanceText = '';
  if (totalBudget > 0) {
    const remaining = Math.max(0, totalBudget - spentInBudgets);
    safeToSpend = remaining / daysLeft;
    allowanceText = `Based on ${formatCurrency(remaining)} remaining across your active micro-budgets.`;
  } else {
    const assumedIncome = curIncome > 0 ? curIncome : recurringIncomeTotal;
    const allowedExpenses = assumedIncome * 0.8; 
    const remaining = Math.max(0, allowedExpenses - curExpenses);
    safeToSpend = remaining / daysLeft;
    if (assumedIncome > 0) {
      allowanceText = `Based on 80% of your ${formatCurrency(assumedIncome)} income minus current expenses.`;
    } else {
      allowanceText = `Add an income source or micro-budgets to accurately calculate your allowance.`;
    }
  }

  const calendarDays = [];
  let runningBalance = totals.liquidAssets; // Start with current liquid assets

  for(let offset = 0; offset < 30; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dayOfMonth = d.getDate();
    const dayOfWeek = d.toLocaleDateString('en-US', {weekday: 'short'});
    const isToday = offset === 0;
    
    // Create local date string YYYY-MM-DD
    const dateString = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    // Find recurring bills for this day of the month
    const monthStr = dateString.slice(0, 7);
    const recurringBills = recurring.filter(r => {
      if ((r.day || 1) !== dayOfMonth) return false;
      // Check if this recurring bill was already posted in the month of 'd'
      const alreadyPosted = transactions.some(t => t.date.startsWith(monthStr) && t.description === r.description);
      return !alreadyPosted;
    }).map(r => ({ ...r, isRecurring: true }));
    
    // Find one-off transactions for this specific date
    const oneOffTxs = transactions.filter(t => t.date === dateString).map(t => ({ ...t, isRecurring: false }));
    
    // Combine them
    const dayBills = [...recurringBills, ...oneOffTxs];

    // Calculate projected change for the day
    let dayNetChange = 0;
    dayBills.forEach(b => {
      const drAcc = accounts.find(a => a.id === b.debitAccount);
      const crAcc = accounts.find(a => a.id === b.creditAccount);
      
      const drIsLiquid = drAcc && drAcc.type === 'asset' && drAcc.liquidity !== 'invested';
      const crIsLiquid = crAcc && crAcc.type === 'asset' && crAcc.liquidity !== 'invested';
      
      if (drIsLiquid && !crIsLiquid) {
        dayNetChange += b.amount;
      } else if (!drIsLiquid && crIsLiquid) {
        dayNetChange -= b.amount;
      }
    });

    // If it's today, we don't add the net change to the running balance yet because today's actual transactions are already in totals.liquidAssets.
    // Wait, future one-offs for today might not be cleared, but let's just project from tomorrow onwards for simplicity, or project from today's end.
    // Let's just add the net change to running balance for visualization.
    if (!isToday) {
      runningBalance += dayNetChange;
    }

    calendarDays.push({ 
      i: offset, 
      date: d, 
      dayOfMonth, 
      dayOfWeek, 
      isToday, 
      dayBills, 
      dateString,
      projectedBalance: runningBalance,
      netChange: dayNetChange
    });
  }

  const microBudgets = accounts.filter(a => a.type === 'expense' && (a.budget || 0) > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">Dashboard</h2>
      
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 md:p-6 mb-6 text-white shadow-lg shadow-blue-500/30 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-white/20 p-3 rounded-2xl shrink-0">
            <Coffee className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div>
            <p className="text-blue-100 text-xs md:text-sm font-medium uppercase tracking-widest mb-0.5">Safe to spend today</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl md:text-4xl font-black">{formatCurrency(safeToSpend)}</p>
              <p className="text-blue-100 text-xs md:text-sm pb-1">/ {daysLeft} days left</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-xl text-xs md:text-sm border border-white/20 backdrop-blur-sm text-center md:text-right w-full md:max-w-xs">
          {allowanceText}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex flex-col gap-1 shadow-sm dark:shadow-blue-900/10">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Coins className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">Liquid Cash</span>
          </div>
          <p className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`} onClick={toggleHideBalances} title="Click to show/hide balance">{formatCurrency(totals.liquidAssets)}</p>
          <p className={`text-[10px] md:text-xs text-slate-500 dark:text-gray-400 mt-1 truncate ${blurClass}`} onClick={toggleHideBalances}>≈ {runwayMonths} months runway</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-gray-800 flex flex-col gap-1 md:gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Lock className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">Locked</span>
          </div>
          <p className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`} onClick={toggleHideBalances} title="Click to show/hide balance">{formatCurrency(totals.lockedAssets)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-gray-800 flex flex-col gap-1 md:gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">Liabilities</span>
          </div>
          <p className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`} onClick={toggleHideBalances} title="Click to show/hide balance">{formatCurrency(totals.liabilities)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 flex flex-col gap-1 md:gap-2 shadow-sm dark:shadow-emerald-900/10">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium truncate">Net Worth</span>
          </div>
          <p className={`text-lg md:text-2xl font-bold text-slate-900 dark:text-white truncate ${blurClass}`} onClick={toggleHideBalances} title="Click to show/hide balance">{formatCurrency(totals.netWorth)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm mt-2 md:mt-6 overflow-hidden">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-500" /> 30-Day Forecast
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x no-scrollbar">
          {calendarDays.map(day => (
            <div 
              key={day.i} 
              onClick={() => setSelectedDay(day)}
              className={`min-w-[80px] shrink-0 p-2.5 rounded-2xl border cursor-pointer transition-all hover:scale-105 ${day.isToday ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm' : 'bg-white border-slate-100 dark:bg-gray-800/50 dark:border-gray-700/50'} ${day.projectedBalance < 0 ? 'border-red-300 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10' : ''} flex flex-col items-center snap-start`}
            >
              <span className={`text-[9px] uppercase font-bold tracking-wider ${day.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-gray-500'}`}>{day.dayOfWeek}</span>
              <span className={`text-xl font-black ${day.isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-gray-200'}`}>{day.dayOfMonth}</span>
              <div className="w-full flex flex-col gap-1 mt-2 min-h-[16px] justify-end">
                {day.dayBills.length > 0 ? day.dayBills.slice(0, 3).map((b: any, idx: number) => {
                  const drAcc = accounts.find(a => a.id === b.debitAccount);
                  const crAcc = accounts.find(a => a.id === b.creditAccount);
                  const drIsLiquid = drAcc && drAcc.type === 'asset' && drAcc.liquidity !== 'invested';
                  const crIsLiquid = crAcc && crAcc.type === 'asset' && crAcc.liquidity !== 'invested';
                  
                  let isPositive = false;
                  let isNeutral = false;
                  if (drIsLiquid && !crIsLiquid) isPositive = true;
                  else if (drIsLiquid && crIsLiquid) isNeutral = true;
                  else if (!drIsLiquid && !crIsLiquid) isNeutral = true;
                  
                  const colorClass = isNeutral ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400' : 
                                     isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                     'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
                  const prefix = isNeutral ? '' : isPositive ? '+' : '-';
                  return <div key={idx} className={`text-[9px] ${colorClass} px-1 py-0.5 rounded truncate w-full text-center font-medium`} title={b.description}>{prefix}{formatCurrency(b.amount)}</div>;
                }) : <div className="h-1 w-1 bg-slate-200 dark:bg-gray-700 rounded-full mx-auto opacity-50"></div>}
                {day.dayBills.length > 3 && <div className="text-[9px] text-slate-400 text-center">+{day.dayBills.length - 3} more</div>}
              </div>
              <div className={`mt-2 pt-2 border-t w-full text-center text-[9px] font-bold ${day.projectedBalance < 0 ? 'text-red-500 border-red-200 dark:border-red-800/50' : 'text-slate-500 border-slate-100 dark:border-gray-700/50 dark:text-gray-400'} ${blurClass}`} onClick={(e) => { e.stopPropagation(); toggleHideBalances(); }}>
                {formatCurrency(day.projectedBalance)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" /> 
                {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between mb-6 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50">
                <div>
                  <p className="text-[10px] uppercase text-slate-500 dark:text-gray-400 font-bold mb-1">Net Change</p>
                  <p className={`font-black ${selectedDay.netChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedDay.netChange >= 0 ? '+' : ''}{formatCurrency(selectedDay.netChange)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-500 dark:text-gray-400 font-bold mb-1">Proj. Balance</p>
                  <p className={`font-black ${blurClass} ${selectedDay.projectedBalance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`} onClick={toggleHideBalances}>
                    {formatCurrency(selectedDay.projectedBalance)}
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-3 uppercase tracking-wider">Scheduled Events</h3>
              {selectedDay.dayBills.length > 0 ? (
                <ul className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                  {selectedDay.dayBills.map((b: any, idx: number) => {
                    const drAcc = accounts.find(a => a.id === b.debitAccount);
                    const crAcc = accounts.find(a => a.id === b.creditAccount);
                    const drIsLiquid = drAcc && drAcc.type === 'asset' && drAcc.liquidity !== 'invested';
                    const crIsLiquid = crAcc && crAcc.type === 'asset' && crAcc.liquidity !== 'invested';
                    
                    let isPositive = false;
                    let isNeutral = false;
                    if (drIsLiquid && !crIsLiquid) isPositive = true;
                    else if (drIsLiquid && crIsLiquid) isNeutral = true;
                    else if (!drIsLiquid && !crIsLiquid) isNeutral = true;
                    
                    const amountColor = isNeutral ? 'text-slate-500 dark:text-slate-400' : 
                                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 
                                        'text-slate-900 dark:text-white';
                    const prefix = isNeutral ? '' : isPositive ? '+' : '-';
                    return (
                      <li key={idx} className="p-3 bg-slate-50 dark:bg-gray-800/50 rounded-xl border border-slate-100 dark:border-gray-700/50 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-gray-200 text-sm">{b.description}</p>
                          <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider">
                            {b.isRecurring ? 'Recurring' : 'One-off'}
                          </p>
                        </div>
                        <span className={`font-bold ${amountColor}`}>{prefix}{formatCurrency(b.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-center text-slate-500 dark:text-gray-400 py-8 text-sm">No events scheduled for this day.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2 md:mt-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-emerald-500" /> Micro-Budgets
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-5">Your strict monthly limits (Envelope system)</p>
            <div className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50">
              {microBudgets.length > 0 ? microBudgets.map(a => {
                const spent = accSpent[a.id] || 0;
                const pct = Math.min(100, (spent / (a.budget || 1)) * 100);
                const isWarning = pct >= 80;
                const isDanger = pct >= 100;
                const barColor = isDanger ? 'bg-red-500' : (isWarning ? 'bg-orange-500' : 'bg-blue-500');
                const textColor = isDanger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-gray-300';
                
                return (
                  <div key={a.id} className="mb-4 last:mb-0">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className={`text-sm font-medium ${textColor}`}>{a.name}</span>
                      <span className={`text-xs font-bold ${textColor}`}>{formatCurrency(spent)} / {formatCurrency(a.budget || 0)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{width: `${pct}%`}}></div>
                    </div>
                    {isWarning && !isDanger && <p className="text-[10px] text-orange-500 mt-1 italic">Approaching limit</p>}
                    {isDanger && <p className="text-[10px] text-red-500 mt-1 font-bold">Budget exceeded!</p>}
                  </div>
                );
              }) : <p className="text-xs text-slate-400 dark:text-gray-500 italic py-2">No micro-budgets active.</p>}
            </div>
          </div>
      
          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Entries</h3>
              <button onClick={() => switchTab('transactions')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {recentTxs.length > 0 ? recentTxs.map(t => {
                const drAcc = accounts.find(a => a.id === t.debitAccount)?.name || 'Unknown';
                const isFuture = t.date > todayStr;
                return (
                  <div 
                    key={t.id} 
                    onClick={() => setSlideOverTxId(t.id)}
                    className="flex justify-between items-center p-3.5 md:p-4 bg-slate-50 hover:bg-slate-100 dark:bg-gray-850 dark:hover:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="truncate pr-4 flex-1">
                      <p className="font-medium text-slate-800 dark:text-gray-200 truncate flex items-center gap-2">
                        {t.description}
                        {t.receipt && <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                        {isFuture && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Pending</span>}
                      </p>
                      <p className="text-[11px] md:text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">{t.date} &bull; {drAcc}</p>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-gray-100 shrink-0">{formatCurrency(t.amount)}</span>
                  </div>
                );
              }) : <div className="text-slate-400 dark:text-gray-500 text-sm text-center py-6 bg-slate-50 dark:bg-gray-900/50 rounded-xl border border-slate-200 dark:border-gray-800 border-dashed">No entries yet.</div>}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Habits & Streaks
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/50">
                <div className="text-3xl">🔥</div>
                <div>
                  <p className="font-bold text-orange-600 dark:text-orange-400 text-lg">{streaks.loggingStreak} Days</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">Logging Streak</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-3xl">🎯</div>
                <div>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{streaks.savingsStreak} Months</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">20%+ Savings Rate Streak</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Repeat className="w-5 h-5 text-blue-500" /> Recurring Flows
              </h3>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Income</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(recurringIncomeTotal)}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Expenses</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">-{formatCurrency(recurringExpenseTotal)}</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50 max-h-48 overflow-y-auto">
              {recurring.length > 0 ? recurring.map((r, idx) => {
                const crAcc = accounts.find(a => a.id === r.creditAccount);
                const isIncome = crAcc && crAcc.type === 'income';
                const amountColor = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white';
                const prefix = isIncome ? '+' : '-';
                return (
                  <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-gray-800/50 last:border-0">
                    <span className="text-sm font-medium text-slate-600 dark:text-gray-300 truncate pr-2">{r.description}</span>
                    <span className={`font-bold ${amountColor} text-sm shrink-0`}>{prefix}{formatCurrency(r.amount)}</span>
                  </div>
                );
              }) : <p className="text-xs text-slate-400 dark:text-gray-500 italic py-2">No recurring templates saved.</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" /> Smart Goals
              </h3>
            </div>
            <div className="space-y-3">
              {goals.length > 0 ? goals.map(g => {
                const acc = accounts.find(a => a.id === g.linkedAccountId);
                const bal = acc ? getAccountBalance(acc.id, accounts, transactions) : 0;
                const pct = Math.min(100, Math.max(0, (bal / g.targetAmount) * 100));
                const remaining = Math.max(0, g.targetAmount - bal);
                
                let projectionText = '';
                if (remaining === 0) {
                  projectionText = '<span class="text-emerald-500 font-medium">Goal Reached! 🎉</span>';
                } else if (avgs.avgSavings > 0) {
                  const monthsLeft = Math.ceil(remaining / avgs.avgSavings);
                  projectionText = `Est. completion: ${monthsLeft} month${monthsLeft !== 1 ? 's' : ''}`;
                } else {
                  projectionText = 'Savings rate too low to project.';
                }

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
                  <div key={g.id} className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full shadow-sm border border-slate-200 dark:border-gray-700">
                          <GoalIcon className="w-5 h-5 text-slate-300 dark:text-gray-600 absolute" />
                          <div 
                            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full"
                            style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}
                          >
                            <GoalIcon className="w-5 h-5 text-purple-500" />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-gray-200 text-sm">{g.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">Linked: {acc ? acc.name : 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600 dark:text-purple-400 text-sm">{formatCurrency(bal)}</p>
                        <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">of {formatCurrency(g.targetAmount)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{width: `${pct}%`}}></div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-2 italic" dangerouslySetInnerHTML={{__html: projectionText}}></p>
                  </div>
                );
              }) : <div className="text-slate-400 dark:text-gray-500 text-xs italic p-4 text-center border border-dashed border-slate-200 dark:border-gray-700 rounded-xl">No active goals. Add one in Accounts.</div>}
            </div>
          </div>
        </div>
      </div>

      <TransactionSlideOver 
        isOpen={!!slideOverTxId} 
        onClose={() => setSlideOverTxId(null)} 
        transactionId={slideOverTxId} 
      />
    </div>
  );
};
