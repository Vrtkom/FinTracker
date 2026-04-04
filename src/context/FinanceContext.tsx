import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account, Transaction, Recurring, Goal, Scenario, CustomReport, Budget } from '../types';
import { auth, db, signInWithGoogle, logout } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { onAuthStateChanged, User } from 'firebase/auth';

interface FinanceContextType {
  user: User | null;
  login: () => Promise<void>;
  logoutUser: () => Promise<void>;
  isUnlocked: boolean;
  setIsUnlocked: (val: boolean) => void;
  hideBalances: boolean;
  setHideBalances: (val: boolean) => void;
  accounts: Account[];
  setAccounts: (accs: Account[]) => Promise<void>;
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => Promise<void>;
  recurring: Recurring[];
  setRecurring: (recs: Recurring[]) => Promise<void>;
  goals: Goal[];
  setGoals: (goals: Goal[]) => Promise<void>;
  budgets: Budget[];
  setBudgets: (budgets: Budget[]) => Promise<void>;
  
  showRecurringModal: boolean;
  setShowRecurringModal: (val: boolean) => void;
  showManageRecurringModal: boolean;
  setShowManageRecurringModal: (val: boolean) => void;
  
  viewingReceipt: string | null;
  setViewingReceipt: (val: string | null) => void;
  
  scenario: Scenario | null;
  setScenario: (val: Scenario | null) => void;
  
  managingPotsFor: string | null;
  setManagingPotsFor: (val: string | null) => void;
  
  journalFilterAccount: string;
  setJournalFilterAccount: (val: string) => void;
  
  customReport: CustomReport;
  setCustomReport: (val: CustomReport) => void;
  
  activityStreak: number;
  
  clearAllData: () => void;
  migrateLocalData: () => Promise<void>;
}

const defaultReport: CustomReport = {
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  showDetails: false,
  showSankey: false,
  comparePreviousPeriod: false,
  type: 'pnl',
  data: null
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [isUnlocked, setIsUnlocked] = useState(true); // Default to true, rely on Firebase Auth
  const [hideBalances, setHideBalances] = useState(localStorage.getItem('fintrack_hide_balances') !== 'false');
  
  const [accounts, setAccountsState] = useState<Account[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [recurring, setRecurringState] = useState<Recurring[]>([]);
  const [goals, setGoalsState] = useState<Goal[]>([]);
  const [budgets, setBudgetsState] = useState<Budget[]>([]);
  
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showManageRecurringModal, setShowManageRecurringModal] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [managingPotsFor, setManagingPotsFor] = useState<string | null>(null);
  const [journalFilterAccount, setJournalFilterAccount] = useState<string>('');
  const [customReport, setCustomReport] = useState<CustomReport>(defaultReport);
  const [activityStreak, setActivityStreak] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setAccountsState([]);
        setTransactionsState([]);
        setRecurringState([]);
        setGoalsState([]);
        setBudgetsState([]);
        setActivityStreak(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const unsubAccounts = onSnapshot(collection(db, `users/${user.uid}/accounts`), (snapshot) => {
      setAccountsState(snapshot.docs.map(doc => doc.data() as Account));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/accounts`));

    const unsubTransactions = onSnapshot(collection(db, `users/${user.uid}/transactions`), (snapshot) => {
      setTransactionsState(snapshot.docs.map(doc => doc.data() as Transaction));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/transactions`));

    const unsubRecurring = onSnapshot(collection(db, `users/${user.uid}/recurring`), (snapshot) => {
      setRecurringState(snapshot.docs.map(doc => doc.data() as Recurring));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/recurring`));

    const unsubGoals = onSnapshot(collection(db, `users/${user.uid}/goals`), (snapshot) => {
      setGoalsState(snapshot.docs.map(doc => doc.data() as Goal));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/goals`));

    const unsubBudgets = onSnapshot(collection(db, `users/${user.uid}/budgets`), (snapshot) => {
      setBudgetsState(snapshot.docs.map(doc => doc.data() as Budget));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/budgets`));

    const unsubActivity = onSnapshot(doc(db, `users/${user.uid}/stats/activity`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const lastActive = data.lastActiveDate;
        const currentStreak = data.streak || 0;
        const today = new Date().toISOString().split('T')[0];
        
        if (lastActive !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          let newStreak = currentStreak;
          if (lastActive === yesterdayStr) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
          
          setDoc(doc(db, `users/${user.uid}/stats/activity`), {
            lastActiveDate: today,
            streak: newStreak
          }, { merge: true });
          
          setActivityStreak(newStreak);
        } else {
          setActivityStreak(currentStreak);
        }
      } else {
        const today = new Date().toISOString().split('T')[0];
        setDoc(doc(db, `users/${user.uid}/stats/activity`), {
          lastActiveDate: today,
          streak: 1
        });
        setActivityStreak(1);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/stats/activity`));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Trigger a re-read of the document to update streak if day changed
        getDoc(doc(db, `users/${user.uid}/stats/activity`)).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const lastActive = data.lastActiveDate;
            const currentStreak = data.streak || 0;
            const today = new Date().toISOString().split('T')[0];
            
            if (lastActive !== today) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              
              let newStreak = currentStreak;
              if (lastActive === yesterdayStr) {
                newStreak += 1;
              } else {
                newStreak = 1;
              }
              
              setDoc(doc(db, `users/${user.uid}/stats/activity`), {
                lastActiveDate: today,
                streak: newStreak
              }, { merge: true });
            }
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubAccounts();
      unsubTransactions();
      unsubRecurring();
      unsubGoals();
      unsubBudgets();
      unsubActivity();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isAuthReady]);

  const syncCollection = async (collectionName: string, currentData: any[], newData: any[]) => {
    if (!user) return;
    
    // Process in chunks of 400 to stay safely under Firestore's 500 limit per batch
    const chunkSize = 400;
    
    // Find deleted items
    const newIds = new Set(newData.map(item => item.id));
    const itemsToDelete = currentData.filter(item => !newIds.has(item.id));
    
    // Find added or updated items
    const currentMap = new Map(currentData.map(item => [item.id, item]));
    const itemsToSet = newData.filter(item => {
      const currentItem = currentMap.get(item.id);
      // If it doesn't exist in currentData, it's new
      if (!currentItem) return true;
      // If it exists, check if it changed (simple JSON stringify comparison)
      return JSON.stringify(item) !== JSON.stringify(currentItem);
    });
    
    const allOperations = [
      ...itemsToDelete.map(item => ({ type: 'delete' as const, id: item.id })),
      ...itemsToSet.map(item => ({ type: 'set' as const, item }))
    ];

    if (allOperations.length === 0) return;

    try {
      for (let i = 0; i < allOperations.length; i += chunkSize) {
        const chunk = allOperations.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(op => {
          if (op.type === 'delete') {
            batch.delete(doc(db, `users/${user.uid}/${collectionName}/${op.id}`));
          } else {
            batch.set(doc(db, `users/${user.uid}/${collectionName}/${op.item.id}`), { ...op.item, uid: user.uid });
          }
        });
        
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/${collectionName}`);
    }
  };

  const migrateLocalData = async () => {
    if (!user) return;
    try {
      const rawAccounts = JSON.parse(localStorage.getItem('fintrack_accounts') || '[]');
      const rawTransactions = JSON.parse(localStorage.getItem('fintrack_transactions') || '[]');
      const rawRecurring = JSON.parse(localStorage.getItem('fintrack_recurring') || '[]');
      const rawGoals = JSON.parse(localStorage.getItem('fintrack_goals') || '[]');

      const localAccounts = rawAccounts.map((a: any) => ({
        ...a,
        id: a.id || Math.random().toString(36).substr(2, 9),
        isArchived: a.isArchived ?? false,
        type: ['asset', 'liability', 'equity', 'income', 'expense'].includes(a.type) ? a.type : 'asset'
      }));

      const localTransactions = rawTransactions.map((t: any) => ({
        ...t,
        id: t.id || Math.random().toString(36).substr(2, 9),
        cleared: t.cleared ?? false,
        receipt: t.receipt ?? null
      }));

      const localRecurring = rawRecurring.map((r: any) => ({
        ...r,
        id: r.id || Math.random().toString(36).substr(2, 9)
      }));

      const localGoals = rawGoals.map((g: any) => ({
        ...g,
        id: g.id || Math.random().toString(36).substr(2, 9)
      }));

      if (localAccounts.length > 0) await syncCollection('accounts', accounts, localAccounts);
      if (localTransactions.length > 0) await syncCollection('transactions', transactions, localTransactions);
      if (localRecurring.length > 0) await syncCollection('recurring', recurring, localRecurring);
      if (localGoals.length > 0) await syncCollection('goals', goals, localGoals);

      localStorage.removeItem('fintrack_accounts');
      localStorage.removeItem('fintrack_transactions');
      localStorage.removeItem('fintrack_recurring');
      localStorage.removeItem('fintrack_goals');
      
      alert("Local data successfully migrated to the cloud!");
    } catch (error) {
      console.error("Migration failed:", error);
      alert("Failed to migrate local data.");
    }
  };

  const setAccounts = (accs: Account[]) => syncCollection('accounts', accounts, accs);
  const setTransactions = (txs: Transaction[]) => syncCollection('transactions', transactions, txs);
  const setRecurring = (recs: Recurring[]) => syncCollection('recurring', recurring, recs);
  const setGoals = (gs: Goal[]) => syncCollection('goals', goals, gs);
  const setBudgets = (bs: Budget[]) => syncCollection('budgets', budgets, bs);

  useEffect(() => {
    const currentMonthKey = new Date().toISOString().split('T')[0].slice(0,7);
    if (localStorage.getItem('fintrack_last_checkin') !== currentMonthKey && recurring.length > 0) {
      setShowRecurringModal(true);
    }
  }, [recurring.length]);

  const clearAllData = async () => {
    if (!user) return;
    await setAccounts([]);
    await setTransactions([]);
    await setRecurring([]);
    await setGoals([]);
    await setBudgets([]);
    localStorage.removeItem('fintrack_last_checkin');
  };

  const login = async () => {
    await signInWithGoogle();
  };

  const logoutUser = async () => {
    await logout();
  };

  return (
    <FinanceContext.Provider value={{
      user, login, logoutUser,
      isUnlocked, setIsUnlocked,
      hideBalances, setHideBalances,
      accounts, setAccounts,
      transactions, setTransactions,
      recurring, setRecurring,
      goals, setGoals,
      budgets, setBudgets,
      showRecurringModal, setShowRecurringModal,
      showManageRecurringModal, setShowManageRecurringModal,
      viewingReceipt, setViewingReceipt,
      scenario, setScenario,
      managingPotsFor, setManagingPotsFor,
      journalFilterAccount, setJournalFilterAccount,
      customReport, setCustomReport,
      activityStreak,
      clearAllData, migrateLocalData
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};
