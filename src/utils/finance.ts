import { Account, Transaction, Recurring } from '../types';

export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export const getAccountBalance = (
  accountId: string, 
  accounts: Account[], 
  transactions: Transaction[], 
  includeFuture = false, 
  onlyCleared = false
) => {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return 0;
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  const totalDebits = transactions
    .filter(t => (includeFuture || t.date <= todayStr) && (!onlyCleared || t.cleared !== false) && t.debitAccount === accountId)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalCredits = transactions
    .filter(t => (includeFuture || t.date <= todayStr) && (!onlyCleared || t.cleared !== false) && t.creditAccount === accountId)
    .reduce((sum, t) => sum + t.amount, 0);
    
  return (account.type === 'asset' || account.type === 'expense') ? totalDebits - totalCredits : totalCredits - totalDebits;
};

export const getTotals = (accounts: Account[], transactions: Transaction[]) => {
  let liquidAssets = 0, lockedAssets = 0, assets = 0, liabilities = 0, equity = 0, income = 0, expenses = 0;
  
  accounts.forEach(acc => {
    const bal = getAccountBalance(acc.id, accounts, transactions);
    if (acc.type === 'asset') {
      assets += bal;
      if (acc.liquidity === 'invested') lockedAssets += bal;
      else liquidAssets += bal;
    }
    if (acc.type === 'liability') liabilities += bal;
    if (acc.type === 'equity') equity += bal;
    if (acc.type === 'income') income += bal;
    if (acc.type === 'expense') expenses += bal;
  });
  
  return { 
    liquidAssets, 
    lockedAssets, 
    assets, 
    liabilities, 
    equity, 
    income, 
    expenses, 
    netWorth: assets - liabilities, 
    netIncome: income - expenses 
  };
};

export const getAverages = (accounts: Account[], transactions: Transaction[]) => {
  const monthlyData: Record<string, { income: number, needs: number, expenses: number }> = {};
  const todayStr = new Date().toISOString().split('T')[0];
  
  transactions.forEach(t => {
    if (t.date > todayStr) return;
    const monthKey = t.date.substring(0, 7);
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, needs: 0, expenses: 0 };
    
    const crAcc = accounts.find(a => a.id === t.creditAccount);
    if (crAcc && crAcc.type === 'income') monthlyData[monthKey].income += t.amount;
    
    const drAcc = accounts.find(a => a.id === t.debitAccount);
    if (drAcc && drAcc.type === 'expense') {
      monthlyData[monthKey].expenses += t.amount;
      monthlyData[monthKey].needs += t.amount;
    }
  });
  
  const months = Object.values(monthlyData);
  if (months.length === 0) return { avgSavings: 0, avgNeeds: 0 };
  
  const totalSavings = months.reduce((sum, m) => sum + (m.income - m.expenses), 0);
  const totalNeeds = months.reduce((sum, m) => sum + m.needs, 0);
  
  return { 
    avgSavings: totalSavings / months.length, 
    avgNeeds: totalNeeds / months.length 
  };
};

export const getGamificationStreaks = (accounts: Account[], transactions: Transaction[]) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const uniqueDates = [...new Set(transactions.filter(t => t.date <= todayStr).map(t => t.date))].sort().reverse();
  
  let loggingStreak = 0;
  const d = new Date();
  const todayDateStr = d.toISOString().split('T')[0];
  d.setDate(d.getDate() - 1);
  const yestStr = d.toISOString().split('T')[0];
  
  let cursorDate = new Date();
  if (uniqueDates.includes(todayDateStr) || uniqueDates.includes(yestStr)) {
    if (!uniqueDates.includes(todayDateStr)) cursorDate.setDate(cursorDate.getDate() - 1);
    while(true) {
      const dateStr = cursorDate.toISOString().split('T')[0];
      if (uniqueDates.includes(dateStr)) {
        loggingStreak++;
        cursorDate.setDate(cursorDate.getDate() - 1);
      } else break;
    }
  }

  let savingsStreak = 0;
  const monthlyData: Record<string, { income: number, exp: number }> = {};
  
  transactions.forEach(t => {
    if (t.date > todayStr) return;
    const monthKey = t.date.substring(0, 7);
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, exp: 0 };
    
    const crAcc = accounts.find(a => a.id === t.creditAccount);
    if (crAcc && crAcc.type === 'income') monthlyData[monthKey].income += t.amount;
    
    const drAcc = accounts.find(a => a.id === t.debitAccount);
    if (drAcc && drAcc.type === 'expense') monthlyData[monthKey].exp += t.amount;
  });

  const sortedMonths = Object.keys(monthlyData).sort().reverse();
  for (const month of sortedMonths) {
    const data = monthlyData[month];
    if (data.income > 0 && ((data.income - data.exp) / data.income) >= 0.20) {
      savingsStreak++;
    } else break; 
  }

  return { loggingStreak, savingsStreak };
};
