import React from "react";
import { X } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";

export const ReceiptModal = () => {
  const { viewingReceipt, setViewingReceipt } = useFinance();

  if (!viewingReceipt) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => setViewingReceipt(null)}
    >
      <img
        src={viewingReceipt}
        alt="Receipt"
        className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={() => setViewingReceipt(null)}
        className="absolute top-6 right-6 text-white hover:text-red-400 transition-colors"
      >
        <X className="w-10 h-10" />
      </button>
    </div>
  );
};
