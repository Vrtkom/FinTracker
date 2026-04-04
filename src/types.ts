export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type Liquidity = 'liquid' | 'invested';
export type TransactionIntent = 'need' | 'want' | 'investment' | 'transfer';

export interface Pot {
  id: string;
  name: string;
  amount: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  liquidity?: Liquidity;
  budget?: number;
  excludeFromForecast?: boolean;
  isArchived: boolean;
  pots?: Pot[];
}

export interface Split {
  id: string;
  contactName: string;
  amount: number;
  settled: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
  cleared: boolean;
  receipt: string | null;
  tags?: string[];
  groupId?: string;
  intent?: TransactionIntent; // Need vs Want classification
  splits?: Split[]; // Splitwise-style bill splitting
}

export interface Recurring {
  id: string;
  description: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
  day: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  linkedAccountId: string;
}

export interface Budget {
  id: string;
  tag: string;
  limit: number;
  period: 'monthly';
}

export interface Scenario {
  desc: string;
  amount: number;
  monthOffset: number;
}

export interface CustomReport {
  startDate: string;
  endDate: string;
  showDetails: boolean;
  showSankey: boolean;
  comparePreviousPeriod?: boolean;
  type: 'pnl' | 'cashflow' | 'ledger';
  data: any;
}
