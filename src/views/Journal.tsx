import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, ArrowUpDown, ArrowLeftRight, Camera, CheckCircle, ShieldCheck, Paperclip, CheckCircle2, Copy, Trash2, Download } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getAccountBalance } from '../utils/finance';

export const Journal = () => {
  const { accounts, transactions, setTransactions, recurring, setRecurring, setViewingReceipt } = useFinance();
  
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDebit, setTxDebit] = useState('');
  const [txCredit, setTxCredit] = useState('');
  const [txDebitSearch, setTxDebitSearch] = useState('');
  const [txCreditSearch, setTxCreditSearch] = useState('');
  const [txRecurring, setTxRecurring] = useState(false);
  const [txCleared, setTxCleared] = useState(true);
  const [txReceiptBase64, setTxReceiptBase64] = useState<string | null>(null);
  const [txTags, setTxTags] = useState('');
  
  const [showDebitOptions, setShowDebitOptions] = useState(false);
  const [showCreditOptions, setShowCreditOptions] = useState(false);

  const [filterSearch, setFilterSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterDate, setFilterDate] = useState('all');

  const debitRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (debitRef.current && !debitRef.current.contains(event.target as Node)) {
        setShowDebitOptions(false);
      }
      if (creditRef.current && !creditRef.current.contains(event.target as Node)) {
        setShowCreditOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDescInput = (val: string) => {
    setTxDesc(val);
    const lowerVal = val.toLowerCase();
    const autoTags: Record<string, string[]> = {
      'food': ['zomato', 'swiggy', 'blinkit', 'zepto', 'dinner', 'lunch', 'food', 'restaurant', 'mcdonalds'],
      'travel': ['uber', 'ola', 'rapido', 'flight', 'train', 'bus', 'fuel', 'petrol', 'metro', 'auto'],
      'utilities': ['electricity', 'water', 'wifi', 'internet', 'jio', 'airtel', 'recharge'],
      'entertainment': ['netflix', 'spotify', 'amazon prime', 'movie', 'bookmyshow', 'steam']
    };

    let matchedAcc = null;
    for (const [category, keywords] of Object.entries(autoTags)) {
      if (keywords.some(w => lowerVal.includes(w))) {
        matchedAcc = accounts.find(a => !a.isArchived && a.type === 'expense' && 
          (a.name.toLowerCase().includes(category) || keywords.some(k => a.name.toLowerCase().includes(k)))
        );
        break;
      }
    }

    if (matchedAcc && txDebit !== matchedAcc.id) {
      setTxDebit(matchedAcc.id);
      setTxDebitSearch(`${matchedAcc.name} (${matchedAcc.type.charAt(0).toUpperCase() + matchedAcc.type.slice(1)})`);
      handleDebitChange(matchedAcc.id);
    }
  };

  const handleDebitChange = (drId: string) => {
    const recentTx = [...transactions].reverse().find(t => t.debitAccount === drId);
    if (recentTx) {
      const crAcc = accounts.find(a => a.id === recentTx.creditAccount);
      if (crAcc && !crAcc.isArchived) {
        setTxCredit(crAcc.id);
        setTxCreditSearch(`${crAcc.name} (${crAcc.type.charAt(0).toUpperCase() + crAcc.type.slice(1)})`);
      }
    }
  };

  const swapAccounts = () => {
    const tempId = txDebit;
    const tempText = txDebitSearch;
    setTxDebit(txCredit);
    setTxDebitSearch(txCreditSearch);
    setTxCredit(tempId);
    setTxCreditSearch(tempText);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setTxReceiptBase64(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    
    if (!txDebit || !txCredit) return alert("Please select valid accounts from the dropdown.");
    if (txDebit === txCredit) return alert("Debit and Credit accounts cannot be the same.");

    const newTx = { 
      id: Date.now().toString(), 
      date: txDate, 
      description: txDesc, 
      amount, 
      debitAccount: txDebit, 
      creditAccount: txCredit,
      cleared: txCleared,
      receipt: txReceiptBase64,
      tags: txTags.split(',').map(t => t.trim()).filter(Boolean)
    };
    
    if (txRecurring) {
      const txDay = parseInt(txDate.split('-')[2], 10);
      const isDup = recurring.some(r => r.description === txDesc && r.amount === amount && r.debitAccount === txDebit && r.creditAccount === txCredit);
      if (!isDup) setRecurring([...recurring, { id: Date.now().toString() + '_rec', description: txDesc, amount, debitAccount: txDebit, creditAccount: txCredit, day: txDay }]);
    }

    setTransactions([...transactions, newTx]);
    setIsAddingTx(false);
    
    // Reset form
    setTxDesc('');
    setTxAmount('');
    setTxDebit('');
    setTxCredit('');
    setTxDebitSearch('');
    setTxCreditSearch('');
    setTxRecurring(false);
    setTxCleared(true);
    setTxReceiptBase64(null);
    setTxTags('');
  };

  const duplicateTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    
    setIsAddingTx(true);
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxDesc(tx.description);
    setTxAmount(String(tx.amount));
    
    const drAcc = accounts.find(a => a.id === tx.debitAccount);
    const crAcc = accounts.find(a => a.id === tx.creditAccount);
    
    if (drAcc) {
      setTxDebit(drAcc.id);
      setTxDebitSearch(`${drAcc.name} (${drAcc.type})`);
    }
    if (crAcc) {
      setTxCredit(crAcc.id);
      setTxCreditSearch(`${crAcc.name} (${crAcc.type})`);
    }
    if (tx.tags) {
      setTxTags(tx.tags.join(', '));
    }
    
    window.scrollTo(0, 0);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const toggleCleared = (id: string) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, cleared: !t.cleared } : t));
  };

  const inputClasses = "w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl outline-none transition-all text-sm md:text-base dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500";

  const getSelectOptionsHTML = (side: 'debit' | 'credit', searchTerm: string) => {
    return accounts
      .filter(a => !a.isArchived && a.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(a => (
        <div 
          key={a.id}
          className="p-3 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer text-slate-800 dark:text-gray-200 border-b border-slate-100 dark:border-gray-700/50 last:border-0 flex justify-between items-center transition-colors" 
          onClick={() => {
            if (side === 'debit') {
              setTxDebit(a.id);
              setTxDebitSearch(`${a.name} (${a.type.charAt(0).toUpperCase() + a.type.slice(1)})`);
              setShowDebitOptions(false);
              handleDebitChange(a.id);
            } else {
              setTxCredit(a.id);
              setTxCreditSearch(`${a.name} (${a.type.charAt(0).toUpperCase() + a.type.slice(1)})`);
              setShowCreditOptions(false);
            }
          }}
        >
          <span className="font-medium text-sm md:text-base">{a.name}</span>
          <span className="text-[9px] md:text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider bg-slate-100 dark:bg-gray-950 px-2 py-1 rounded">{a.type}</span>
        </div>
      ));
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Debit Account', 'Credit Account', 'Cleared', 'Tags'];
    const rows = transactions.map(t => {
      const drAcc = accounts.find(a => a.id === t.debitAccount)?.name || 'Unknown';
      const crAcc = accounts.find(a => a.id === t.creditAccount)?.name || 'Unknown';
      return [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        `"${drAcc}"`,
        `"${crAcc}"`,
        t.cleared ? 'Yes' : 'No',
        `"${(t.tags || []).join(', ')}"`
      ].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FINTrack_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let filteredTxs = [...transactions];
  if (filterSearch) {
    const term = filterSearch.toLowerCase();
    filteredTxs = filteredTxs.filter(t => 
      t.description.toLowerCase().includes(term) || 
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }
  if (filterAccount) {
    filteredTxs = filteredTxs.filter(t => t.debitAccount === filterAccount || t.creditAccount === filterAccount);
  }
  if (filterDate !== 'all') {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    filteredTxs = filteredTxs.filter(t => {
      const td = new Date(t.date);
      if (filterDate === 'this_month') {
        return td.getMonth() === m && td.getFullYear() === y;
      } else if (filterDate === 'last_month') {
        const prevM = m === 0 ? 11 : m - 1;
        const prevY = m === 0 ? y - 1 : y;
        return td.getMonth() === prevM && td.getFullYear() === prevY;
      }
      return true;
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Journal</h2>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV} 
            className="bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 px-3 md:px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button 
            onClick={() => setIsAddingTx(!isAddingTx)} 
            className={`${isAddingTx ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white dark:hover:bg-blue-500 shadow-lg shadow-blue-500/20'} px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-bold flex items-center gap-2 text-sm md:text-base transition-all`}
          >
            {isAddingTx ? 'Cancel' : <><Plus className="w-4 h-4 md:w-5 md:h-5" /> New Entry</>}
          </button>
        </div>
      </div>
      
      {isAddingTx && (
        <form onSubmit={addTransaction} className="bg-white dark:bg-gray-900 p-5 md:p-8 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Date</label>
            <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className={inputClasses} required />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Description <span className="text-[10px] font-normal italic">(Use #hashtags for trips)</span></label>
            <input type="text" value={txDesc} onChange={e => handleDescInput(e.target.value)} placeholder="e.g. Swiggy #Weekend" className={inputClasses} required />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Tags <span className="text-[10px] font-normal italic">(comma separated)</span></label>
            <input type="text" value={txTags} onChange={e => setTxTags(e.target.value)} placeholder="e.g. food, trip" className={inputClasses} />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-500 dark:text-gray-400 mb-1.5">Amount</label>
            <input type="number" step="0.01" min="0" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" className={inputClasses} required />
          </div>
          
          <div className="lg:col-span-2 relative custom-select-container mt-2 md:mt-0" ref={debitRef}>
            <label className="block text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 mb-1.5">Debit (Dr)</label>
            <div className="relative">
              <input 
                type="text" 
                value={txDebitSearch}
                onChange={e => setTxDebitSearch(e.target.value)}
                onFocus={() => setShowDebitOptions(true)}
                className={`${inputClasses} pr-10 cursor-text`} 
                placeholder="Search account..." 
                autoComplete="off" 
                required 
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
              </div>
            </div>
            {showDebitOptions && (
              <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 mt-1 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {getSelectOptionsHTML('debit', txDebitSearch)}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center -my-2 md:my-0 lg:pb-1 relative z-10 pt-4 md:pt-6">
            <button type="button" onClick={swapAccounts} className="bg-white dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 p-2 md:p-3 rounded-full border border-slate-200 dark:border-gray-700 shadow-sm transition-colors">
              <ArrowUpDown className="w-5 h-5 md:hidden" />
              <ArrowLeftRight className="w-5 h-5 hidden md:block" />
            </button>
          </div>

          <div className="lg:col-span-2 relative custom-select-container" ref={creditRef}>
            <label className="block text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">Credit (Cr)</label>
            <div className="relative">
              <input 
                type="text" 
                value={txCreditSearch}
                onChange={e => setTxCreditSearch(e.target.value)}
                onFocus={() => setShowCreditOptions(true)}
                className={`${inputClasses} pr-10 focus:border-emerald-500 focus:ring-emerald-500 cursor-text`} 
                placeholder="Search account..." 
                autoComplete="off" 
                required 
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 dark:text-gray-500" />
              </div>
            </div>
            {showCreditOptions && (
              <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 mt-1 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {getSelectOptionsHTML('credit', txCreditSearch)}
              </div>
            )}
          </div>
          
          <div className="lg:col-span-5 flex flex-col md:flex-row justify-between items-center mt-2 md:mt-4 md:border-t border-slate-100 dark:border-gray-800 md:pt-6 gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-gray-400">
                <input type="checkbox" checked={txRecurring} onChange={e => setTxRecurring(e.target.checked)} className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 cursor-pointer accent-blue-600" />
                Recurring Template
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-gray-400">
                <input type="checkbox" checked={txCleared} onChange={e => setTxCleared(e.target.checked)} className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-gray-800 cursor-pointer accent-emerald-600" />
                Mark Cleared
              </label>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button type="button" onClick={() => document.getElementById('txReceiptFile')?.click()} className="flex-1 md:flex-none text-slate-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 flex justify-center items-center gap-1.5 text-sm bg-slate-100 dark:bg-gray-800 px-4 py-3.5 rounded-xl transition-colors">
                <Camera className="w-4 h-4" /> <span className={txReceiptBase64 ? 'text-emerald-500 font-bold' : ''}>{txReceiptBase64 ? 'Attached ✓' : 'Receipt'}</span>
              </button>
              <input type="file" id="txReceiptFile" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
              
              <button type="submit" className="flex-[2] md:flex-none bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Post Entry
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm mb-6 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1 relative">
          <input type="text" placeholder="Search entries or #tags..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className={`${inputClasses} pl-10 py-2.5`} />
          <Search className="w-4 h-4 absolute left-3 top-[14px] text-slate-400" />
        </div>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className={`${inputClasses} w-full md:w-48 py-2.5`}>
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className={`${inputClasses} w-full md:w-48 py-2.5`}>
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
        </select>
      </div>

      {filterAccount && (() => {
        const acc = accounts.find(a => a.id === filterAccount);
        if (acc && (acc.type === 'asset' || acc.type === 'liability')) {
          const book = getAccountBalance(acc.id, accounts, transactions, true);
          const cleared = getAccountBalance(acc.id, accounts, transactions, false, true);
          const uncleared = book - cleared;
          return (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-5 rounded-3xl mb-6 flex flex-col md:flex-row md:justify-between md:items-center shadow-sm gap-4">
              <div>
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-1 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Audit Mode: {acc.name}</h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">Book Balance: {formatCurrency(book)} &bull; Cleared: {formatCurrency(cleared)}</p>
              </div>
              <div className="md:text-right bg-white dark:bg-gray-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-[10px] uppercase font-bold text-blue-500 mb-0.5">Uncleared Variance</p>
                <p className={`text-lg font-black ${Math.abs(uncleared) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{formatCurrency(Math.abs(uncleared))}</p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-3xl border border-slate-200 dark:border-gray-800 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 text-xs text-slate-500 dark:text-gray-400 uppercase tracking-widest">
              <th className="p-5 font-semibold">Date</th>
              <th className="p-5 font-semibold">Description</th>
              <th className="p-5 font-semibold">Debit (Dr)</th>
              <th className="p-5 font-semibold">Credit (Cr)</th>
              <th className="p-5 font-semibold text-right">Amount</th>
              <th className="p-5 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTxs.slice().reverse().map(t => {
              const drAcc = accounts.find(a => a.id === t.debitAccount)?.name || 'Archived/Deleted';
              const crAcc = accounts.find(a => a.id === t.creditAccount)?.name || 'Archived/Deleted';
              const isFuture = t.date > todayStr;
              const isCleared = t.cleared !== false;

              return (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/80 border-b border-slate-100 dark:border-gray-800 transition-colors">
                  <td className="p-5 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{t.date}</td>
                  <td className="p-5 font-medium text-slate-800 dark:text-gray-200">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {t.description}
                        {t.receipt && <button onClick={() => setViewingReceipt(t.receipt)} title="View Receipt" className="text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg"><Paperclip className="w-4 h-4" /></button>}
                        {isFuture && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Pending</span>}
                      </div>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {t.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wider">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-5 text-sm text-blue-600 dark:text-blue-400 font-medium">{drAcc}</td>
                  <td className="p-5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">{crAcc}</td>
                  <td className="p-5 font-bold text-right text-slate-900 dark:text-gray-100">{formatCurrency(t.amount)}</td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => toggleCleared(t.id)} title={isCleared ? 'Mark Uncleared' : 'Mark Cleared'} className={`p-1.5 rounded-lg transition-colors ${isCleared ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'text-slate-400 bg-slate-100 dark:bg-gray-800'}`}><CheckCircle2 className="w-4 h-4" /></button>
                      <button onClick={() => duplicateTransaction(t.id)} title="Duplicate Entry" className="text-slate-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 bg-white dark:bg-gray-900 border border-slate-200 dark:border-transparent hover:border-blue-200 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => deleteTransaction(t.id)} title="Delete" className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 bg-white dark:bg-gray-900 border border-slate-200 dark:border-transparent hover:border-red-200 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden block">
        {filteredTxs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm p-10 text-center text-slate-500 dark:text-gray-500 text-sm">No entries match your filters.</div>
        ) : (
          filteredTxs.slice().reverse().map(t => {
            const drAcc = accounts.find(a => a.id === t.debitAccount)?.name || 'Archived/Deleted';
            const crAcc = accounts.find(a => a.id === t.creditAccount)?.name || 'Archived/Deleted';
            const isFuture = t.date > todayStr;
            const isCleared = t.cleared !== false;

            return (
              <div key={t.id} className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-slate-200 dark:border-gray-800 mb-3 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-slate-900 dark:text-gray-200 text-base leading-tight flex items-center gap-2 flex-wrap">
                      {t.description}
                      {t.receipt && <button onClick={() => setViewingReceipt(t.receipt)} className="text-blue-500 bg-blue-50 dark:bg-blue-900/30 p-1 rounded-md"><Paperclip className="w-3.5 h-3.5" /></button>}
                      {isFuture && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Pending</span>}
                    </p>
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {t.tags.map((tag, i) => (
                          <span key={i} className="text-[9px] bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wider">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-1 font-medium">{t.date}</p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-gray-100 text-lg shrink-0">{formatCurrency(t.amount)}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900 p-2.5 rounded-xl text-xs">
                  <div className="flex-1 truncate"><span className="text-blue-600 dark:text-blue-500 font-bold">Dr</span> <span className="text-slate-700 dark:text-gray-300 truncate">{drAcc}</span></div>
                  <ArrowLeftRight className="w-3 h-3 text-slate-400 dark:text-gray-600 shrink-0" />
                  <div className="flex-1 truncate text-right"><span className="text-emerald-600 dark:text-emerald-500 font-bold">Cr</span> <span className="text-slate-700 dark:text-gray-300 truncate">{crAcc}</span></div>
                </div>
                <div className="flex justify-end gap-3 mt-1 items-center">
                  <button onClick={() => toggleCleared(t.id)} className={`p-1.5 rounded-lg transition-colors ${isCleared ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'text-slate-400 bg-slate-100 dark:bg-gray-800'}`}><CheckCircle2 className="w-4 h-4" /></button>
                  <button onClick={() => duplicateTransaction(t.id)} className="text-blue-500 hover:text-blue-600 dark:text-blue-400/80 dark:hover:text-blue-400 text-xs font-medium flex items-center gap-1 ml-auto"><Copy className="w-3.5 h-3.5" /> Dup</button>
                  <button onClick={() => deleteTransaction(t.id)} className="text-red-500 hover:text-red-600 dark:text-red-400/80 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Del</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
