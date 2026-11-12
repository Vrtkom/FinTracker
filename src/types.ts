export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";
export type Liquidity = "liquid" | "invested";
export type TransactionIntent = "need" | "want" | "investment" | "transfer";

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
  order?: number;
  creditLimit?: number;
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
  merchant?: string;
}

export interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
  tags?: string[];
  merchant?: string;
}

export type FixedCommitmentCategory = "sip" | "rent" | "bill" | "other";
export type FixedCommitmentFrequency = "monthly" | "weekly";

export interface Recurring {
  id: string;
  description: string;
  amount: number;
  debitAccount: string;
  creditAccount: string;
  day: number;
  category?: FixedCommitmentCategory;
  frequency?: FixedCommitmentFrequency;
  dayOfWeek?: number; // 1 = Monday
}

export interface Fund {
  id: string;
  name: string;
  balance: number;
  target?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  linkedAccountId: string;
}

export interface PortfolioItem {
  id: string;
  name: string;
  type: string; // e.g., 'Stock', 'Mutual Fund', 'RD', 'Other'
  investmentType?: "sip" | "one-time" | "sip+"; // Specific to MFs mostly
  investedAmount: number;
  currentValue: number;
  quantity?: number;
  ticker?: string; // Ticker symbol for automatic price updates API
  linkToAccountId?: string; // Optional: To associate with a specific shadow/master account if ever needed
  uid?: string;
}

export interface Budget {
  id: string;
  tag?: string;
  accountId?: string;
  limit: number;
  period: "monthly";
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
  type: "pnl" | "cashflow" | "ledger";
  data: any;
}

export interface CustomBillItem {
  id: string;
  name: string;
  amount: number;
  dueDay?: number;
  accountId?: string;
  isPaid?: boolean;
}

export interface ReverseBudgetConfig {
  monthlyIncomeMode: "auto" | "manual";
  manualIncomeAmount: number;
  fixedBillsMode: "auto" | "custom";
  customBills: CustomBillItem[];
  sipMode: "auto" | "custom";
  customSipAmount: number;
  emergencySavingsMode: "percentage" | "fixed";
  emergencySavingsValue: number;
  emergencyAccountId?: string;
  rolloverUnspent?: boolean;
  uid?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp: number;
  uid?: string;
}
