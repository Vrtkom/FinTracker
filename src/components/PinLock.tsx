import React, { useRef, useState } from "react";
import { Lock, Sun, Moon, Zap, AlertCircle, Loader2 } from "lucide-react";
import { useFinance } from "../context/FinanceContext";

export const PinLock = ({
  theme,
  cycleTheme,
}: {
  theme: string;
  cycleTheme: () => void;
}) => {
  const { login } = useFinance();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const signInLockRef = useRef(false);

  const handleLogin = async () => {
    if (signInLockRef.current || isSigningIn) return;
    signInLockRef.current = true;
    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      await login();
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/popup-blocked") {
        setErrorMessage(
          "Sign-in pop-up was blocked by your browser. Please allow pop-ups for this site and click Sign in with Google again.",
        );
      } else if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        setErrorMessage(
          "The sign-in window was closed before completing. Click below to try again.",
        );
      } else if (code === "auth/network-request-failed") {
        setErrorMessage(
          "Network error while contacting Google. Please check your connection and try again.",
        );
      } else {
        setErrorMessage(
          error?.message || "Failed to sign in with Google. Please try again.",
        );
      }
    } finally {
      signInLockRef.current = false;
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
      <button
        onClick={cycleTheme}
        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors"
        title={`Theme: ${theme}`}
      >
        {theme === "light" ? (
          <Sun className="w-6 h-6" />
        ) : theme === "dark" ? (
          <Moon className="w-6 h-6" />
        ) : (
          <Zap className="w-6 h-6 text-blue-400" />
        )}
      </button>
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-gray-800 w-full max-w-sm text-center">
        <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-600 dark:text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
          FINTrack
        </h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
          Sign in to sync your financial data securely across all your devices.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/60 text-left flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isSigningIn}
          className="w-full bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 dark:text-white p-4 rounded-xl font-bold transition-colors border border-slate-200 dark:border-gray-700 flex items-center justify-center gap-3 shadow-sm cursor-pointer"
        >
          {isSigningIn ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
