import React, { useState } from "react";
import { Insights } from "./Insights";
import { Reports } from "./Reports";

export const Analytics = ({
  switchTab,
}: {
  switchTab: (tab: string) => void;
}) => {
  const [view, setView] = useState<"insights" | "reports">("insights");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Analytics
        </h2>
        <div className="bg-slate-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setView("insights")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === "insights" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}
          >
            Insights
          </button>
          <button
            onClick={() => setView("reports")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === "reports" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}
          >
            Statements
          </button>
        </div>
      </div>

      {view === "insights" ? <Insights switchTab={switchTab} /> : <Reports />}
    </div>
  );
};
