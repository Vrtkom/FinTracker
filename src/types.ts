export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type Liquidity = 'liquid' | 'invested';
export type ExpenseType = 'need' | 'want';

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
  expenseType?: ExpenseType;
  budget?: number;
  excludeFromForecast?: boolean;
  isArchived: boolean;
  pots?: Pot[];
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
  type: 'pnl' | 'cashflow' | 'ledger';
  data: any;
}
