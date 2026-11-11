import { Account, Transaction, Recurring, AccountType } from "../types";

export const getAccountColor = (type: AccountType) => {
  switch (type) {
    case "asset":
      return "#10b981"; // emerald-500
    case "expense":
      return "#eab308"; // yellow-500
    case "income":
      return "#3b82f6"; // blue-500
    case "liability":
      return "#ef4444"; // red-500
    case "equity":
      return "#8b5cf6"; // violet-500
    default:
      return "#64748b"; // slate-500
  }
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount || 0,
  );

export const getAccountBalance = (
  accountId: string,
  accounts: Account[],
  transactions: Transaction[],
  includeFuture = false,
  onlyCleared = false,
  startDate?: string,
  endDate?: string,
) => {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return 0;

  const todayStr = new Date().toISOString().split("T")[0];

  const totalDebits = transactions
    .filter(
      (t) =>
        (includeFuture || t.date <= (endDate || todayStr)) &&
        (!startDate || t.date >= startDate) &&
        (!endDate || t.date <= endDate) &&
        (!onlyCleared || t.cleared !== false) &&
        t.debitAccount === accountId,
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredits = transactions
    .filter(
      (t) =>
        (includeFuture || t.date <= (endDate || todayStr)) &&
        (!startDate || t.date >= startDate) &&
        (!endDate || t.date <= endDate) &&
        (!onlyCleared || t.cleared !== false) &&
        t.creditAccount === accountId,
    )
    .reduce((sum, t) => sum + t.amount, 0);

  return account.type === "asset" || account.type === "expense"
    ? totalDebits - totalCredits
    : totalCredits - totalDebits;
};

export const getTotals = (
  accounts: Account[],
  transactions: Transaction[],
  portfolioItems: any[] = [],
) => {
  let liquidAssets = 0,
    lockedAssets = 0,
    assets = 0,
    liabilities = 0,
    equity = 0,
    income = 0,
    expenses = 0;

  accounts.forEach((acc) => {
    const bal = getAccountBalance(acc.id, accounts, transactions);
    if (acc.type === "asset") {
      assets += bal;
      if (acc.liquidity === "invested") lockedAssets += bal;
      else liquidAssets += bal;
    }
    if (acc.type === "liability") liabilities += bal;
    if (acc.type === "equity") equity += bal;
    if (acc.type === "income") income += bal;
    if (acc.type === "expense") expenses += bal;
  });

  // Handle orphaned transaction sides (e.g., 'PENDING' accounts or deleted accounts)
  // This automatically sweeps missing amounts into Equity to prevent imbalancing the ledger
  const todayStr = new Date().toISOString().split("T")[0];
  transactions.forEach((t) => {
    if (t.date > todayStr) return;

    const debitAcc = accounts.find((a) => a.id === t.debitAccount);
    const creditAcc = accounts.find((a) => a.id === t.creditAccount);

    if (!debitAcc) equity -= t.amount;
    if (!creditAcc) equity += t.amount;
  });

  const portfolioInvested = portfolioItems.reduce(
    (sum, item) => sum + (item.investedAmount || 0),
    0,
  );
  const portfolioCurrent = portfolioItems.reduce(
    (sum, item) => sum + (item.currentValue || 0),
    0,
  );
  const unrealizedGains = portfolioCurrent - portfolioInvested;

  // Apply unrealized gains to assets and locked assets (since investments are locked)
  assets += unrealizedGains;
  lockedAssets += unrealizedGains;

  // To maintain the double-entry accounting balance (Assets = Liabilities + Equity + Income - Expenses),
  // Unrealized Gains must also be added to Equity
  equity += unrealizedGains;

  return {
    liquidAssets,
    lockedAssets,
    assets,
    liabilities,
    equity,
    income,
    expenses,
    netWorth: assets - liabilities,
    netIncome: income - expenses,
  };
};

export const getAverages = (
  accounts: Account[],
  transactions: Transaction[],
) => {
  const monthlyData: Record<
    string,
    { income: number; needs: number; expenses: number }
  > = {};
  const todayStr = new Date().toISOString().split("T")[0];

  transactions.forEach((t) => {
    if (t.date > todayStr) return;
    const monthKey = t.date.substring(0, 7);
    if (!monthlyData[monthKey])
      monthlyData[monthKey] = { income: 0, needs: 0, expenses: 0 };

    const crAcc = accounts.find((a) => a.id === t.creditAccount);
    if (crAcc && crAcc.type === "income")
      monthlyData[monthKey].income += t.amount;

    const drAcc = accounts.find((a) => a.id === t.debitAccount);
    if (drAcc && drAcc.type === "expense") {
      monthlyData[monthKey].expenses += t.amount;
      monthlyData[monthKey].needs += t.amount;
    }
  });

  const months = Object.values(monthlyData);
  if (months.length === 0) return { avgSavings: 0, avgNeeds: 0 };

  const totalSavings = months.reduce(
    (sum, m) => sum + (m.income - m.expenses),
    0,
  );
  const totalNeeds = months.reduce((sum, m) => sum + m.needs, 0);

  return {
    avgSavings: totalSavings / months.length,
    avgNeeds: totalNeeds / months.length,
  };
};

export const getNetWorthChartData = (
  accounts: Account[],
  transactions: Transaction[],
) => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().split("T")[0].substring(0, 7);
    const monthLabel = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const endOfMonthStr = endOfMonth.toISOString().split("T")[0];

    months.push({ monthStr, monthLabel, endOfMonthStr });
  }

  const data = months.map((m) => {
    let assets = 0;
    let liabilities = 0;

    accounts.forEach((acc) => {
      if (acc.type === "asset" || acc.type === "liability") {
        const debits = transactions
          .filter((t) => t.date <= m.endOfMonthStr && t.debitAccount === acc.id)
          .reduce((sum, t) => sum + t.amount, 0);
        const credits = transactions
          .filter(
            (t) => t.date <= m.endOfMonthStr && t.creditAccount === acc.id,
          )
          .reduce((sum, t) => sum + t.amount, 0);
        const bal = acc.type === "asset" ? debits - credits : credits - debits;
        if (acc.type === "asset") assets += bal;
        else liabilities += bal;
      }
    });

    const netWorth = assets - liabilities;

    const impacts: Record<string, number> = {};
    transactions
      .filter((t) => t.date.startsWith(m.monthStr))
      .forEach((t) => {
        const drAcc = accounts.find((a) => a.id === t.debitAccount);
        const crAcc = accounts.find((a) => a.id === t.creditAccount);

        if (drAcc && drAcc.type === "expense")
          impacts[drAcc.name] = (impacts[drAcc.name] || 0) - t.amount;
        if (drAcc && drAcc.type === "income")
          impacts[drAcc.name] = (impacts[drAcc.name] || 0) - t.amount;
        if (drAcc && drAcc.type === "equity")
          impacts[drAcc.name] = (impacts[drAcc.name] || 0) - t.amount;

        if (crAcc && crAcc.type === "income")
          impacts[crAcc.name] = (impacts[crAcc.name] || 0) + t.amount;
        if (crAcc && crAcc.type === "expense")
          impacts[crAcc.name] = (impacts[crAcc.name] || 0) + t.amount;
        if (crAcc && crAcc.type === "equity")
          impacts[crAcc.name] = (impacts[crAcc.name] || 0) + t.amount;
      });

    let topPositive = { name: "None", amount: 0 };
    let topNegative = { name: "None", amount: 0 };

    Object.entries(impacts).forEach(([name, amount]) => {
      if (amount > topPositive.amount) topPositive = { name, amount };
      if (amount < topNegative.amount) topNegative = { name, amount };
    });

    return {
      name: m.monthLabel,
      netWorth,
      topPositive,
      topNegative,
      change: 0,
    };
  });

  for (let i = 1; i < data.length; i++) {
    data[i].change = data[i].netWorth - data[i - 1].netWorth;
  }

  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 6, 0)
    .toISOString()
    .split("T")[0];
  let prevAssets = 0,
    prevLiabs = 0;
  accounts.forEach((acc) => {
    if (acc.type === "asset" || acc.type === "liability") {
      const debits = transactions
        .filter((t) => t.date <= prevMonthEnd && t.debitAccount === acc.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const credits = transactions
        .filter((t) => t.date <= prevMonthEnd && t.creditAccount === acc.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const bal = acc.type === "asset" ? debits - credits : credits - debits;
      if (acc.type === "asset") prevAssets += bal;
      else prevLiabs += bal;
    }
  });
  data[0].change = data[0].netWorth - (prevAssets - prevLiabs);

  return data;
};

export const getGamificationStreaks = (
  accounts: Account[],
  transactions: Transaction[],
) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const uniqueDates = [
    ...new Set(
      transactions.filter((t) => t.date <= todayStr).map((t) => t.date),
    ),
  ]
    .sort()
    .reverse();

  let loggingStreak = 0;
  const d = new Date();
  const todayDateStr = d.toISOString().split("T")[0];
  d.setDate(d.getDate() - 1);
  const yestStr = d.toISOString().split("T")[0];

  let cursorDate = new Date();
  if (uniqueDates.includes(todayDateStr) || uniqueDates.includes(yestStr)) {
    if (!uniqueDates.includes(todayDateStr))
      cursorDate.setDate(cursorDate.getDate() - 1);
    while (true) {
      const dateStr = cursorDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateStr)) {
        loggingStreak++;
        cursorDate.setDate(cursorDate.getDate() - 1);
      } else break;
    }
  }

  let savingsStreak = 0;
  const monthlyData: Record<string, { income: number; exp: number }> = {};

  transactions.forEach((t) => {
    if (t.date > todayStr) return;
    const monthKey = t.date.substring(0, 7);
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, exp: 0 };

    const crAcc = accounts.find((a) => a.id === t.creditAccount);
    if (crAcc && crAcc.type === "income")
      monthlyData[monthKey].income += t.amount;

    const drAcc = accounts.find((a) => a.id === t.debitAccount);
    if (drAcc && drAcc.type === "expense")
      monthlyData[monthKey].exp += t.amount;
  });

  const sortedMonths = Object.keys(monthlyData).sort().reverse();
  for (const month of sortedMonths) {
    const data = monthlyData[month];
    if (data.income > 0 && (data.income - data.exp) / data.income >= 0.2) {
      savingsStreak++;
    } else break;
  }

  return { loggingStreak, savingsStreak };
};
