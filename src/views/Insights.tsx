import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/finance';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const Insights = ({ switchTab }: { switchTab: (tab: string) => void }) => {
  const { accounts, transactions, setJournalFilterAccount, setJournalFilterSearch, setJournalFilterDate } = useFinance();

  const { expenseData, incomeVsExpenseData, topExpenses } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Expense Breakdown (Current Month)
    const expenseMap: Record<string, { value: number, id: string }> = {};
    const monthlyTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    monthlyTxs.forEach(t => {
      const drAcc = accounts.find(a => a.id === t.debitAccount);
      if (drAcc && drAcc.type === 'expense') {
        if (!expenseMap[drAcc.name]) {
          expenseMap[drAcc.name] = { value: 0, id: drAcc.id };
        }
        expenseMap[drAcc.name].value += t.amount;
      }
    });

    const expenseData = Object.entries(expenseMap)
      .map(([name, data]) => ({ name, value: data.value, id: data.id }))
      .sort((a, b) => b.value - a.value);

    const topExpenses = expenseData.slice(0, 5);

    // 2. Income vs Expense (Last 6 Months)
    const monthlyStats: Record<string, { income: number, expense: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString('default', { month: 'short' });
      monthlyStats[monthKey] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const d = new Date(t.date);
      const monthKey = d.toLocaleString('default', { month: 'short' });
      
      if (monthlyStats[monthKey]) {
        const drAcc = accounts.find(a => a.id === t.debitAccount);
        const crAcc = accounts.find(a => a.id === t.creditAccount);
        
        if (drAcc && drAcc.type === 'expense') {
          monthlyStats[monthKey].expense += t.amount;
        }
        if (crAcc && crAcc.type === 'income') {
          monthlyStats[monthKey].income += t.amount;
        }
      }
    });

    const incomeVsExpenseData = Object.entries(monthlyStats).map(([month, data]) => ({
      month,
      Income: data.income,
      Expense: data.expense
    }));

    return { expenseData, incomeVsExpenseData, topExpenses };
  }, [accounts, transactions]);

  const totalMonthlyExpense = expenseData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl">
          <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Insights</h2>
          <p className="text-slate-500 dark:text-gray-400 text-sm">Visual analytics of your finances</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-blue-500" /> This Month's Expenses
          </h3>
          
          {expenseData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={(data) => {
                        if (data && data.payload && data.payload.id) {
                          setJournalFilterAccount(data.payload.id);
                          setJournalFilterSearch('');
                          setJournalFilterDate('all');
                          switchTab('transactions');
                        }
                      }}
                    >
                      {expenseData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {topExpenses.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                    onClick={() => {
                      setJournalFilterAccount(item.id);
                      setJournalFilterSearch('');
                      setJournalFilterDate('all');
                      switchTab('transactions');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400">{((item.value / totalMonthlyExpense) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 dark:text-gray-400 text-sm">
              No expenses recorded this month.
            </div>
          )}
        </div>

        {/* Income vs Expense */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Income vs Expense (6 Months)
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
