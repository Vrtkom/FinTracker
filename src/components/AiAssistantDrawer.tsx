import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Bot,
  User as UserIcon,
  Loader2,
  Lightbulb,
  Copy,
  Check,
  Brain,
  Save,
  ArrowLeft,
  BookmarkCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useFinance } from "../context/FinanceContext";
import { formatCurrency, getAccountBalance, getTotals } from "../utils/finance";
import { AiMemory } from "../types";

export const AiAssistantDrawer = () => {
  const {
    isAiDrawerOpen,
    setIsAiDrawerOpen,
    chatMessages,
    addChatMessage,
    clearChatMessages,
    aiMemory,
    saveAiMemory,
    accounts,
    transactions,
    recurring,
    goals,
    budgets,
    portfolioItems,
  } = useFinance();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"chat" | "memory">("chat");
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState<AiMemory>({
    salary: "",
    investments: "",
    bills: "",
    goalsAndLoans: "",
    customNotes: "",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMemoryDraft({
      salary: aiMemory.salary || "",
      investments: aiMemory.investments || "",
      bills: aiMemory.bills || "",
      goalsAndLoans: aiMemory.goalsAndLoans || "",
      customNotes: aiMemory.customNotes || "",
    });
  }, [aiMemory]);

  const memoryCount = [
    aiMemory.salary,
    aiMemory.investments,
    aiMemory.bills,
    aiMemory.goalsAndLoans,
    aiMemory.customNotes,
  ].filter((v) => v && v.trim().length > 0).length;

  const hasSavedMemory = memoryCount > 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAiDrawerOpen && activeView === "chat") {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isAiDrawerOpen, chatMessages.length, activeView]);

  const quickPrompts = [
    "What is my current net worth and liquid cash?",
    "Which expense categories am I spending most on this month?",
    "Review my monthly salary, investments, and bills plan",
    "How are my savings goals and budgets tracking?",
  ];

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMemory(true);
    try {
      await saveAiMemory(memoryDraft);
      toast.success("AI memory saved & synced to cloud");
      setActiveView("chat");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save AI memory");
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Build real-time financial context summary + persistent user memory
  const buildContextSummary = () => {
    const totals = getTotals(accounts, transactions, portfolioItems);
    const today = new Date().toISOString().split("T")[0];

    const memoryLines: string[] = [];
    if (aiMemory.salary?.trim()) {
      memoryLines.push(`- Salary & Income: ${aiMemory.salary.trim()}`);
    }
    if (aiMemory.investments?.trim()) {
      memoryLines.push(`- Investments & SIPs: ${aiMemory.investments.trim()}`);
    }
    if (aiMemory.bills?.trim()) {
      memoryLines.push(`- Fixed Bills & EMIs: ${aiMemory.bills.trim()}`);
    }
    if (aiMemory.goalsAndLoans?.trim()) {
      memoryLines.push(`- Goals & Loans: ${aiMemory.goalsAndLoans.trim()}`);
    }
    if (aiMemory.customNotes?.trim()) {
      memoryLines.push(`- Additional Context / Preferences: ${aiMemory.customNotes.trim()}`);
    }

    const persistentMemorySection =
      memoryLines.length > 0
        ? `=== PERSISTENT USER FINANCIAL PROFILE (ALWAYS REMEMBER) ===\n${memoryLines.join("\n")}\n\n`
        : "";

    const accountList = accounts
      .map((a) => {
        const bal = getAccountBalance(a.id, accounts, transactions);
        return `- ${a.name} (${a.type}${a.liquidity ? `, ${a.liquidity}` : ""}): ${formatCurrency(bal)}`;
      })
      .join("\n");

    const recentTxs = transactions
      .slice(0, 30)
      .map(
        (t) =>
          `- ${t.date} | ${t.description} | ${formatCurrency(t.amount)} (Debit: ${t.debitAccount}, Credit: ${t.creditAccount})`,
      )
      .join("\n");

    const recurringBills = recurring
      .map(
        (r) =>
          `- ${r.description}: ${formatCurrency(r.amount)} due on day ${r.day || 1}`,
      )
      .join("\n");

    const goalList = goals
      .map((g) => `- ${g.name}: Target ${formatCurrency(g.targetAmount)}`)
      .join("\n");

    const budgetList = budgets
      .map((b) => `- #${b.tag}: Limit ${formatCurrency(b.limit)}/mo`)
      .join("\n");

    return `${persistentMemorySection}=== REAL-TIME LEDGER SNAPSHOT ===
Today's Date: ${today}
Net Worth: ${formatCurrency(totals.netWorth)}
Total Assets: ${formatCurrency(totals.assets)} (Liquid: ${formatCurrency(totals.liquidAssets)}, Invested/Locked: ${formatCurrency(totals.lockedAssets)})
Total Liabilities: ${formatCurrency(totals.liabilities)}
Net Income (All-Time): ${formatCurrency(totals.netIncome)} (Income: ${formatCurrency(totals.income)}, Expenses: ${formatCurrency(totals.expenses)})

Active Accounts & Current Balances:
${accountList || "No accounts configured."}

Upcoming Recurring Bills & Fixed Commitments:
${recurringBills || "None recorded."}

Active Financial Goals:
${goalList || "None configured."}

Budget Limits:
${budgetList || "None configured."}

Recent Transactions (last 30):
${recentTxs || "No transactions yet."}
`;
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    setInput("");
    if (activeView !== "chat") {
      setActiveView("chat");
    }

    // 1. Save user message to state & Firestore
    const userMsg = await addChatMessage({
      role: "user",
      content: textToSend,
    });

    setIsLoading(true);

    try {
      // 2. Prepare message thread for Gemini
      const conversationHistory = [...chatMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const contextSummary = buildContextSummary();

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          contextSummary,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.reply || "I couldn't process that response. Please try again.";

      // 3. Save model reply to state & Firestore
      await addChatMessage({
        role: "model",
        content: replyText,
      });
    } catch (err: any) {
      console.error("AI Error:", err);
      await addChatMessage({
        role: "model",
        content: `⚠️ Sorry, I encountered an issue: ${err.message || "Failed to reach AI service."}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAiDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => setIsAiDrawerOpen(false)}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl h-full flex flex-col z-10 border-l border-slate-200 dark:border-gray-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                FinTrack Copilot
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Gemini 4
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Real-Time Ledger & Persistent Memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setActiveView(activeView === "memory" ? "chat" : "memory")
              }
              className={`relative px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeView === "memory"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:border-blue-500"
              }`}
              title="Manage persistent financial context (Salary, Investments, Bills)"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Memory</span>
              {hasSavedMemory && activeView !== "memory" && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            {activeView === "chat" && chatMessages.length > 0 && (
              <>
                {showConfirmClear ? (
                  <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-2 py-1 rounded-xl text-xs shadow-xs animate-in fade-in">
                    <span className="text-red-700 dark:text-red-300 font-medium text-[11px]">
                      Clear?
                    </span>
                    <button
                      onClick={async () => {
                        setShowConfirmClear(false);
                        await clearChatMessages();
                      }}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 rounded-md text-[11px] transition-colors cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                    title="Clear conversation history (keeps saved Memory)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setIsAiDrawerOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Either Persistent Memory Editor or Chat Thread */}
        {activeView === "memory" ? (
          <form
            onSubmit={handleSaveMemory}
            className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView("chat")}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to chat
              </button>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <BookmarkCheck className="w-3.5 h-3.5" /> Survives cleared chats
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/60 text-xs text-slate-700 dark:text-blue-200 leading-relaxed">
              Save details you want FinTrack Copilot to <strong>always know</strong>—even if you clear chat history or start a new conversation. Synced securely to Firestore.
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-200 mb-1">
                  Salary & Income
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={memoryDraft.salary || ""}
                  onChange={(e) =>
                    setMemoryDraft((prev) => ({ ...prev, salary: e.target.value }))
                  }
                  placeholder="e.g. Monthly take-home ₹1,20,000 credited on 1st; annual bonus ~₹2L in March"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-200 mb-1">
                  Investments & SIPs
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={memoryDraft.investments || ""}
                  onChange={(e) =>
                    setMemoryDraft((prev) => ({
                      ...prev,
                      investments: e.target.value,
                    }))
                  }
                  placeholder="e.g. ₹25,000/mo Nifty 50 & Flexi Cap SIP; ₹5L Emergency FD; moderate-high risk appetite"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-200 mb-1">
                  Fixed Bills & EMIs
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={memoryDraft.bills || ""}
                  onChange={(e) =>
                    setMemoryDraft((prev) => ({ ...prev, bills: e.target.value }))
                  }
                  placeholder="e.g. Rent ₹22,000 (5th), Home Loan EMI ₹18,500 (10th), Wifi ₹1,200, Parents allowance ₹10,000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-200 mb-1">
                  Financial Goals & Loans
                </label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={memoryDraft.goalsAndLoans || ""}
                  onChange={(e) =>
                    setMemoryDraft((prev) => ({
                      ...prev,
                      goalsAndLoans: e.target.value,
                    }))
                  }
                  placeholder="e.g. Build ₹10L emergency fund; save ₹8L for car upgrade by Dec 2027"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-200 mb-1">
                  Other Notes & Preferences
                </label>
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={memoryDraft.customNotes || ""}
                  onChange={(e) =>
                    setMemoryDraft((prev) => ({
                      ...prev,
                      customNotes: e.target.value,
                    }))
                  }
                  placeholder="e.g. 30% tax bracket, prefer concise bullet answers, always remind me to keep 3 months cash liquid"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={isSavingMemory}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isSavingMemory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Persistent Memory</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  setMemoryDraft({
                    salary: "",
                    investments: "",
                    bills: "",
                    goalsAndLoans: "",
                    customNotes: "",
                  })
                }
                className="py-2.5 px-3 text-xs font-medium text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                Clear Fields
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                    <Bot className="w-8 h-8" />
                  </div>
                  <div className="max-w-xs space-y-2">
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">
                      Hi! How can I help with your finances?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      I have real-time visibility into your ledger balances, upcoming bills, category budgets, and savings goals.
                    </p>
                  </div>

                  {/* Persistent Memory Status Card */}
                  <button
                    onClick={() => setActiveView("memory")}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      hasSavedMemory
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400"
                        : "bg-slate-50 dark:bg-gray-800/60 border-dashed border-slate-300 dark:border-gray-700 hover:border-blue-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          hasSavedMemory
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {hasSavedMemory
                            ? `Persistent Memory Active (${memoryCount} saved)`
                            : "Save Salary, Investments & Bills"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                          {hasSavedMemory
                            ? "Context stays loaded even when chat is cleared"
                            : "Store personal context for every new chat"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                      {hasSavedMemory ? "Edit" : "Add"}
                    </span>
                  </button>

                  {/* Quick Prompts Suggestions */}
                  <div className="w-full space-y-2 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Suggested Prompts
                    </p>
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className="w-full p-2.5 text-xs text-left text-slate-700 dark:text-gray-200 bg-slate-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800 border border-slate-200 dark:border-gray-700 rounded-xl transition-all cursor-pointer"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 group ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div
                          className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed ${
                            isUser
                              ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                              : "bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200 rounded-bl-xs border border-slate-200 dark:border-gray-700 shadow-xs"
                          }`}
                        >
                          {isUser ? (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          ) : (
                            <div className="ai-markdown space-y-1.5">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table: ({ children }) => (
                                    <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs bg-white dark:bg-gray-900/70">
                                      <table className="min-w-full text-xs text-left border-collapse divide-y divide-slate-200 dark:divide-gray-700">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({ children }) => (
                                    <thead className="bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white font-semibold">
                                      {children}
                                    </thead>
                                  ),
                                  tbody: ({ children }) => (
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800/80">
                                      {children}
                                    </tbody>
                                  ),
                                  tr: ({ children }) => (
                                    <tr className="hover:bg-slate-50/70 dark:hover:bg-gray-800/50 transition-colors">
                                      {children}
                                    </tr>
                                  ),
                                  th: ({ children }) => (
                                    <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-white">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="px-3 py-2 text-slate-700 dark:text-gray-300">
                                      {children}
                                    </td>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0 leading-relaxed text-slate-800 dark:text-gray-200">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-gray-200">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-gray-200">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="leading-relaxed">{children}</li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-slate-900 dark:text-white">
                                      {children}
                                    </strong>
                                  ),
                                  code: ({ className, children }) => {
                                    const isInline = !className;
                                    return isInline ? (
                                      <code className="px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                                        {children}
                                      </code>
                                    ) : (
                                      <pre className="p-3 my-2 rounded-xl bg-slate-900 text-slate-100 dark:bg-black font-mono text-xs overflow-x-auto border border-slate-800">
                                        <code>{children}</code>
                                      </pre>
                                    );
                                  },
                                  h1: ({ children }) => (
                                    <h1 className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1.5">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5 mb-1">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mt-2 mb-1">
                                      {children}
                                    </h3>
                                  ),
                                  hr: () => (
                                    <hr className="my-2.5 border-slate-200 dark:border-gray-700" />
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>

                              {/* Quick copy message action */}
                              <div className="pt-1.5 flex justify-end">
                                <button
                                  onClick={() => copyMessage(msg.id, msg.content)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded text-[11px] flex items-center gap-1"
                                  title="Copy response"
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span className="text-[10px] text-emerald-500">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span className="text-[10px]">Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isUser && (
                          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex gap-3 justify-start items-center text-slate-500 dark:text-gray-400">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-slate-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 border border-slate-200 dark:border-gray-700 flex items-center gap-2 text-xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        <span>Analyzing your ledger...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick Suggestion Chips (when conversation has started) */}
            {chatMessages.length > 0 && (
              <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-850">
                <button
                  onClick={() => handleSend("What is my safe-to-spend this week?")}
                  className="text-[11px] whitespace-nowrap bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-2.5 py-1 rounded-full text-slate-600 dark:text-gray-300 hover:border-blue-500 cursor-pointer"
                >
                  Safe-to-spend
                </button>
                <button
                  onClick={() => handleSend("Audit my top expenses")}
                  className="text-[11px] whitespace-nowrap bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-2.5 py-1 rounded-full text-slate-600 dark:text-gray-300 hover:border-blue-500 cursor-pointer"
                >
                  Top expenses
                </button>
                <button
                  onClick={() => handleSend("Summary of upcoming recurring bills")}
                  className="text-[11px] whitespace-nowrap bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-2.5 py-1 rounded-full text-slate-600 dark:text-gray-300 hover:border-blue-500 cursor-pointer"
                >
                  Upcoming bills
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 md:p-4 border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your balances, salary, bills, goals..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 text-xs md:text-sm bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400 dark:text-gray-500">
                <span>
                  {hasSavedMemory
                    ? `Powered by Gemini • ${memoryCount} memory profile item${memoryCount > 1 ? "s" : ""} active`
                    : "Powered by Gemini"}
                </span>
                <span>Enter to send</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
