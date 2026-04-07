import React, { useMemo } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getAccountBalance, getAccountColor } from '../utils/finance';
import { Account } from '../types';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export const AccountDetails = ({ accountId, onBack, onEdit }: { accountId: string, onBack: () => void, onEdit: (id: string) => void }) => {
  const { accounts, transactions } = useFinance();
  const account = accounts.find(a => a.id === accountId);

  const accountTxs = useMemo(() => {
    return transactions
      .filter(t => t.debitAccount === accountId || t.creditAccount === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, accountId]);

  const balance = account ? getAccountBalance(account.id, accounts, transactions) : 0;

  const sparklineData = useMemo(() => {
    if (!account) return [];
    let currentBal = balance;
    const data = [{ date: 'Now', balance: currentBal }];
    
    // Go backwards in time to build the sparkline
    for (const tx of accountTxs) {
      if (tx.debitAccount === account.id) {
        currentBal -= tx.amount;
      } else if (tx.creditAccount === account.id) {
        currentBal += tx.amount;
      }
      data.unshift({ date: tx.date, balance: currentBal });
    }
    return data;
  }, [account, accountTxs, balance]);

  if (!account) return <div>Account not found</div>;

  const accColor = getAccountColor(account.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-gray-300" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          {account.name}
          <button onClick={() => onEdit(account.id)} className="p-1.5 bg-slate-100 dark:bg-gray-800 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors">
            <Edit2 className="w-4 h-4 text-slate-500 dark:text-gray-400" />
          </button>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-6">{formatCurrency(balance)}</p>
            
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Line type="monotone" dataKey="balance" stroke={accColor} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {account.type === 'liability' && account.creditLimit && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-gray-800">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Credit Utilization</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {Math.round((balance / account.creditLimit) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${balance / account.creditLimit > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`} 
                    style={{width: `${Math.min(100, (balance / account.creditLimit) * 100)}%`}}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 text-right">{formatCurrency(account.creditLimit)} Limit</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Recent Transactions</h3>
            
            <div className="space-y-3">
              {accountTxs.length > 0 ? accountTxs.map(t => {
                const isDebit = t.debitAccount === account.id;
                const amountColor = isDebit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white';
                const prefix = isDebit ? '+' : '-';
                
                return (
                  <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl border bg-white border-slate-100 dark:bg-gray-900 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 transition-colors">
                    <div className="flex-1 truncate">
                      <p className="font-medium truncate text-slate-800 dark:text-gray-200">{t.description}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{t.date}</p>
                    </div>
                    <span className={`font-bold ${amountColor} shrink-0`}>{prefix}{formatCurrency(t.amount)}</span>
                  </div>
                );
              }) : (
                <p className="text-center text-slate-500 dark:text-gray-400 py-8 text-sm">No transactions found for this account.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
