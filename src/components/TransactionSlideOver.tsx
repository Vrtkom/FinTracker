import React, { useState, useEffect } from 'react';
import { X, Paperclip, Calendar, ArrowRight, Tag, Edit2, Save, Trash2, MapPin } from 'lucide-react';
import { formatCurrency } from '../utils/finance';
import { useFinance } from '../context/FinanceContext';
import { toast } from 'sonner';

interface TransactionSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
}

export const TransactionSlideOver: React.FC<TransactionSlideOverProps> = ({ isOpen, onClose, transactionId }) => {
  const { transactions, setTransactions, accounts } = useFinance();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Edit form state
  const [txDate, setTxDate] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDebit, setTxDebit] = useState('');
  const [txCredit, setTxCredit] = useState('');
  const [txTags, setTxTags] = useState('');
  const [txMerchant, setTxMerchant] = useState('');

  const transaction = transactions.find(t => t.id === transactionId);

  useEffect(() => {
    if (transaction && isOpen) {
      setTxDate(transaction.date);
      setTxDesc(transaction.description);
      setTxAmount(transaction.amount.toString());
      setTxDebit(transaction.debitAccount);
      setTxCredit(transaction.creditAccount);
      setTxTags(transaction.tags ? transaction.tags.join(', ') : '');
      setTxMerchant(transaction.merchant || '');
      setIsEditing(false);
    }
  }, [transaction, isOpen]);

  if (!isOpen) return null;

  const drAcc = accounts.find(a => a.id === transaction?.debitAccount);
  const crAcc = accounts.find(a => a.id === transaction?.creditAccount);

  const handleSave = () => {
    if (!transaction) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!txDebit || !txCredit) {
      toast.error('Please select both debit and credit accounts');
      return;
    }

    const updatedTx = {
      ...transaction,
      date: txDate,
      description: txDesc,
      amount,
      debitAccount: txDebit,
      creditAccount: txCredit,
      tags: txTags.split(',').map(t => t.trim()).filter(Boolean),
      merchant: txMerchant.trim() || undefined
    };

    setTransactions(transactions.map(t => t.id === transaction.id ? updatedTx : t));
    setIsEditing(false);
    toast.success('Transaction updated');
  };

  const handleDelete = () => {
    if (!transaction) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!transaction) return;
    setTransactions(transactions.filter(t => t.id !== transaction.id));
    setShowDeleteConfirm(false);
    onClose();
    toast.success('Transaction deleted');
  };

  const inputClasses = "w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl outline-none transition-all text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white";

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/50 dark:bg-black/60 z-[100] backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* SlideOver Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-200 dark:border-gray-800 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Transaction' : 'Transaction Details'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && transaction && (
              <button onClick={handleDelete} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors bg-slate-100 dark:bg-gray-800 p-2 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {transaction ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Amount</label>
                  <input type="number" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Description</label>
                  <input type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Date</label>
                  <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Merchant / Location</label>
                  <input type="text" value={txMerchant} onChange={e => setTxMerchant(e.target.value)} placeholder="e.g. Target, Amazon" className={inputClasses} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Debit Account (To)</label>
                  <select value={txDebit} onChange={e => setTxDebit(e.target.value)} className={inputClasses}>
                    {accounts.filter(a => !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Credit Account (From)</label>
                  <select value={txCredit} onChange={e => setTxCredit(e.target.value)} className={inputClasses}>
                    {accounts.filter(a => !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Tags (comma separated)</label>
                  <input type="text" value={txTags} onChange={e => setTxTags(e.target.value)} className={inputClasses} />
                </div>
              </div>
            ) : (
              <>
                {/* Amount & Description */}
                <div className="text-center space-y-2 mb-8">
                  <div className="text-4xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(transaction.amount)}
                  </div>
                  <p className="text-lg font-medium text-slate-600 dark:text-gray-300">
                    {transaction.description}
                  </p>
                </div>

                {/* Meta Info Grid */}
                <div className="bg-slate-50 dark:bg-gray-800/50 rounded-2xl p-5 space-y-4 border border-slate-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 dark:text-gray-300 font-medium">{transaction.date}</span>
                  </div>
                  
                  {transaction.merchant && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-gray-300 font-medium">{transaction.merchant}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-slate-600 dark:text-gray-300 font-medium truncate">{crAcc?.name || 'Unknown'}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600 dark:text-gray-300 font-medium truncate">{drAcc?.name || 'Unknown'}</span>
                    </div>
                  </div>

                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className="flex items-start gap-3 text-sm pt-2 border-t border-slate-200 dark:border-gray-700">
                      <Tag className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div className="flex flex-wrap gap-2">
                        {transaction.tags.map((tag, idx) => (
                          <span key={idx} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt Image */}
                {transaction.receipt && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-slate-400" /> Receipt
                    </h3>
                    <div className="bg-slate-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-700">
                      <img src={transaction.receipt} alt="Receipt" className="w-full h-auto object-contain max-h-64" />
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-gray-400">
            Transaction not found.
          </div>
        )}

        {/* Footer Actions */}
        {transaction && (
          <div className="p-6 border-t border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900">
            {isEditing ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit Transaction
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Delete Transaction?</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
