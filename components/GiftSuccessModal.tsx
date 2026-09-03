"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Sparkles, X, ArrowRight } from "lucide-react";
import { StockIcon } from "./StockIcon";
import { TokenizedStock } from "@/lib/tokens";

interface GiftSuccessModalProps {
  giftId: string;
  stock: TokenizedStock;
  amount: string;
  recipient: string;
  isTimeLocked: boolean;
  unlockDateTime: string;
  onClose: () => void;
}

export function GiftSuccessModal({
  giftId,
  stock,
  amount,
  recipient,
  isTimeLocked,
  unlockDateTime,
  onClose,
}: GiftSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const giftUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/gift/${giftId}`
      : `/gift/${giftId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(giftUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formattedUnlockDate = isTimeLocked && unlockDateTime
    ? new Date(unlockDateTime).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-[#0E1118] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Gift #{giftId} Created!</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Base
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {isTimeLocked ? "Time-locked onchain custody" : "Instantly claimable by recipient"}
            </p>
          </div>
        </div>

        {/* Gift Summary Pill */}
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <StockIcon symbol={stock.symbol} size={28} />
              <div>
                <span className="font-bold text-sm text-white">{stock.symbol}</span>
                <span className="text-xs text-zinc-400 block">{stock.name}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-lg font-bold text-white tracking-tight">
                {amount} {stock.symbol}
              </span>
              <span className="text-[11px] text-zinc-500 block">Tokenized Equity</span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Recipient</span>
            <span className="font-mono text-zinc-200">
              {recipient.slice(0, 8)}...{recipient.slice(-6)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Unlock Schedule</span>
            <span className="text-zinc-200 font-medium">
              {isTimeLocked ? formattedUnlockDate : "Instant (No Lock)"}
            </span>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-2 mb-6">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Shareable Gift Link
          </label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/60 border border-zinc-800">
            <input
              type="text"
              readOnly
              value={giftUrl}
              className="flex-1 bg-transparent text-xs font-mono text-zinc-300 px-2 outline-none truncate"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Send this link to the recipient so they can view and claim their stock gift.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href={`/gift/${giftId}`}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            View Gift Card
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-sm transition"
          >
            Send Another
          </button>
        </div>
      </div>
    </div>
  );
}
