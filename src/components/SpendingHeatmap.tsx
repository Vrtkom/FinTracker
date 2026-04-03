import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { startOfYear, endOfYear, eachDayOfInterval, format, parseISO } from 'date-fns';

export const SpendingHeatmap: React.FC = () => {
  const { transactions, accounts } = useFinance();
  const [threshold, setThreshold] = useState<number>(1000);

  const heatmapData = useMemo(() => {
    const today = new Date();
    const start = startOfYear(today);
    const end = endOfYear(today);
    const days = eachDayOfInterval({ start, end });

    const dailySpending = new Map<string, number>();
    const dailyActivity = new Set<string>();
    const expenseAccounts = new Set(accounts.filter(a => a.type === 'expense').map(a => a.id));
    
    // Calculate spending per day and track activity
    transactions.forEach(t => {
      try {
        const parsedDate = parseISO(t.date);
        if (!isNaN(parsedDate.getTime())) {
          const dateStr = format(parsedDate, 'yyyy-MM-dd');
          dailyActivity.add(dateStr); // Mark day as active
          
          if (expenseAccounts.has(t.debitAccount)) {
            dailySpending.set(dateStr, (dailySpending.get(dateStr) || 0) + t.amount);
          }
        }
      } catch (e) {
        // Ignore invalid dates
      }
    });

    // Find max spending for color scaling
    let maxSpending = 0;
    dailySpending.forEach(amount => {
      if (amount > maxSpending) maxSpending = amount;
    });

    const maxRedDiff = Math.max(maxSpending - threshold, 1); // Avoid division by zero
    const maxGreenDiff = threshold > 0 ? threshold : 1;

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const amount = dailySpending.get(dateStr) || 0;
      const isActive = dailyActivity.has(dateStr);
      
      // Default to grey for inactive days
      let colorClass = 'bg-slate-100 dark:bg-gray-800'; 
      
      if (isActive) {
        if (amount > threshold) {
          // Red scale: intensity based on absolute diff above threshold
          const diff = amount - threshold;
          const intensity = diff / maxRedDiff;
          if (intensity < 0.2) colorClass = 'bg-red-200 dark:bg-red-900/40';
          else if (intensity < 0.4) colorClass = 'bg-red-300 dark:bg-red-800/60';
          else if (intensity < 0.6) colorClass = 'bg-red-400 dark:bg-red-700/80';
          else if (intensity < 0.8) colorClass = 'bg-red-500 dark:bg-red-600';
          else colorClass = 'bg-red-600 dark:bg-red-500';
        } else {
          // Green scale: intensity based on absolute diff below threshold
          const diff = threshold - amount;
          const intensity = diff / maxGreenDiff;
          if (intensity < 0.2) colorClass = 'bg-emerald-100 dark:bg-emerald-900/40';
          else if (intensity < 0.4) colorClass = 'bg-emerald-200 dark:bg-emerald-800/60';
          else if (intensity < 0.6) colorClass = 'bg-emerald-300 dark:bg-emerald-700/80';
          else if (intensity < 0.8) colorClass = 'bg-emerald-400 dark:bg-emerald-600';
          else colorClass = 'bg-emerald-500 dark:bg-emerald-500';
        }
      }

      return {
        date: day,
        dateStr,
        amount,
        isActive,
        colorClass
      };
    });
  }, [transactions, accounts, threshold]);

  // Group by months for display
  const months = useMemo(() => {
    const grouped: { [key: string]: typeof heatmapData } = {};
    heatmapData.forEach(day => {
      const month = format(day.date, 'MMM');
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(day);
    });
    return grouped;
  }, [heatmapData]);

  // We need to render a grid. A standard contribution graph is 7 rows (days of week) and ~52 columns (weeks).
  // Let's build a grid of weeks.
  const weeks = useMemo(() => {
    const weeksArray: (typeof heatmapData)[] = [];
    let currentWeek: typeof heatmapData = [];
    
    heatmapData.forEach(day => {
      if (currentWeek.length === 0) {
        // Pad the first week if the year doesn't start on Sunday
        const dayOfWeek = day.date.getDay();
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: new Date(0), dateStr: '', amount: 0, isActive: false, colorClass: 'bg-transparent' });
        }
      }
      
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      // Pad the last week
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), dateStr: '', amount: 0, isActive: false, colorClass: 'bg-transparent' });
      }
      weeksArray.push(currentWeek);
    }
    
    return weeksArray;
  }, [heatmapData]);

  return (
    <div className="bg-white dark:bg-gray-900 p-5 md:p-8 rounded-3xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Spending Heatmap
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Daily expense intensity. Grey means no activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="threshold" className="text-sm font-medium text-slate-700 dark:text-gray-300">
            Daily Target (₹):
          </label>
          <input
            type="number"
            id="threshold"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            className="w-24 p-2 bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg outline-none transition-all text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            min="0"
            step="100"
          />
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="inline-block min-w-max">
          {/* Heatmap Grid */}
          <div className="flex gap-1 pt-6">
            {/* Day of Week Labels */}
            <div className="flex flex-col gap-1 text-[10px] text-slate-400 dark:text-gray-500 font-medium pr-2 justify-between py-1">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Cells */}
            {weeks.map((week, weekIndex) => {
              const firstValidDay = week.find(d => d.dateStr !== '');
              let monthLabel = null;
              
              if (firstValidDay) {
                const month = format(firstValidDay.date, 'MMM');
                const prevWeek = weeks[weekIndex - 1];
                const prevFirstValidDay = prevWeek?.find(d => d.dateStr !== '');
                const prevMonth = prevFirstValidDay ? format(prevFirstValidDay.date, 'MMM') : null;
                
                if (month !== prevMonth) {
                  monthLabel = month;
                }
              }

              return (
                <div key={weekIndex} className="flex flex-col gap-1 relative">
                  {monthLabel && (
                    <span className="absolute -top-6 left-0 text-xs text-slate-500 dark:text-gray-400 font-medium whitespace-nowrap">
                      {monthLabel}
                    </span>
                  )}
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${day.colorClass} ${day.dateStr ? 'cursor-pointer hover:ring-2 hover:ring-slate-400 dark:hover:ring-gray-500 transition-all' : ''}`}
                      title={day.dateStr ? `${format(day.date, 'MMM d, yyyy')}: ₹${day.amount.toFixed(2)}` : ''}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500 dark:text-gray-400">
            <span>No Activity</span>
            <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-gray-800" />
            <span className="ml-4">Below Target</span>
            <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
            <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700/80" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800/60" />
            <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40" />
            <span className="ml-4">Above Target</span>
            <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900/40" />
            <div className="w-3 h-3 rounded-sm bg-red-300 dark:bg-red-800/60" />
            <div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-700/80" />
            <div className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-600" />
            <div className="w-3 h-3 rounded-sm bg-red-600 dark:bg-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
