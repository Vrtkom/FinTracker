import React, { useState } from 'react';
import { LayoutGrid, X, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, getAccountBalance } from '../../utils/finance';

export const VirtualPotsModal = () => {
  const { managingPotsFor, setManagingPotsFor, accounts, setAccounts, transactions } = useFinance();
  const [newPotName, setNewPotName] = useState('');
  const [newPotAmt, setNewPotAmt] = useState('');

  if (!managingPotsFor) return null;

  const acc = accounts.find(a => a.id === managingPotsFor);
  if (!acc) return null;

  const bal = getAccountBalance(acc.id, accounts, transactions);
  const pots = acc.pots || [];
  const potsTotal = pots.reduce((s, p) => s + p.amount, 0);
  const unallocated = bal - potsTotal;

  const addPot = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPotName.trim();
    const amount = parseFloat(newPotAmt);
    if (!name || isNaN(amount)) return;
    
    const updatedAccounts = accounts.map(a => {
      if (a.id === managingPotsFor) {
        return {
          ...a,
          pots: [...(a.pots || []), { id: Date.now().toString(), name, amount }]
        };
      }
      return a;
    });
    
    setAccounts(updatedAccounts);
    setNewPotName('');
    setNewPotAmt('');
  };

  const deletePot = (potId: string) => {
    const updatedAccounts = accounts.map(a => {
      if (a.id === managingPotsFor) {
        return {
          ...a,
          pots: (a.pots || []).filter(p => p.id !== potId)
        };
      }
      return a;
    });
    setAccounts(updatedAccounts);
  };

  const addUnallocatedToPot = (potId: string, amountToAdd: number) => {
    if (amountToAdd === 0) return;
    const updatedAccounts = accounts.map(a => {
      if (a.id === managingPotsFor) {
        return {
          ...a,
          pots: (a.pots || []).map(p => p.id === potId ? { ...p, amount: Math.max(0, p.amount + amountToAdd) } : p)
        };
      }
      return a;
    });
    setAccounts(updatedAccounts);
  };

  const inputClasses = "w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl outline-none transition-all text-sm md:text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500";

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-purple-500" /> Virtual Pots
          </h2>
          <button onClick={() => setManagingPotsFor(null)} className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex justify-between mb-4 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-slate-100 dark:border-gray-700/50">
            <div>
              <p className="text-[10px] uppercase text-slate-500 dark:text-gray-400 font-bold mb-1">Total Balance</p>
              <p className="font-black text-slate-900 dark:text-white">{formatCurrency(bal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-slate-500 dark:text-gray-400 font-bold mb-1">Unallocated</p>
              <p className={`font-black ${unallocated >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(unallocated)}</p>
            </div>
          </div>
          <form onSubmit={addPot} className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Pot Name" 
              className={`${inputClasses} py-2`} 
              value={newPotName}
              onChange={e => setNewPotName(e.target.value)}
              required 
            />
            <input 
              type="number" 
              step="0.01" 
              placeholder="Amount" 
              className={`${inputClasses} py-2 w-24`} 
              value={newPotAmt}
              onChange={e => setNewPotAmt(e.target.value)}
              required 
            />
            <button type="submit" className="bg-purple-600 text-white px-4 rounded-xl hover:bg-purple-700 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </form>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pots.map(p => (
              <div key={p.id} className="flex flex-col gap-2 bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-700/50">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm text-slate-700 dark:text-gray-300">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(p.amount)}</span>
                    <button onClick={() => deletePot(p.id)} className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {unallocated !== 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end mt-2">
                    {[0.1, 0.25, 0.5, 0.75, 1].map(ratio => {
                      const amt = unallocated * ratio;
                      const label = ratio === 1 ? 'All' : `${ratio * 100}%`;
                      return (
                        <button 
                          key={ratio}
                          onClick={() => addUnallocatedToPot(p.id, amt)}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${unallocated > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'}`}
                        >
                          {unallocated > 0 ? '+' : ''}{label} ({formatCurrency(amt)})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {pots.length === 0 && <p className="text-xs text-slate-500 dark:text-gray-400 text-center italic py-2">No pots created yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
