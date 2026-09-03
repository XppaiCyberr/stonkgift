"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import { STONK_GIFT_ABI } from "@/lib/abi";
import { getStonkGiftAddress } from "@/lib/contract";
import { SUPPORTED_STOCKS } from "@/lib/tokens";
import confetti from "canvas-confetti";
import {
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ArrowRight,
  ExternalLink,
  Gift,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface GiftCardProps {
  giftId: string;
}

export function GiftCard({ giftId }: GiftCardProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getStonkGiftAddress(chainId);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  // Read Gift Data
  const {
    data: giftData,
    isLoading: isGiftLoading,
    error: giftError,
    refetch: refetchGift,
  } = useReadContract({
    address: contractAddress,
    abi: STONK_GIFT_ABI,
    functionName: "getGift",
    args: [BigInt(giftId)],
  });

  // Claim Gift Transaction
  const {
    data: claimTxHash,
    isPending: isClaimPending,
    writeContract: writeClaim,
  } = useWriteContract();

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({
      hash: claimTxHash,
    });

  // Cancel Gift Transaction
  const {
    data: cancelTxHash,
    isPending: isCancelPending,
    writeContract: writeCancel,
  } = useWriteContract();

  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } =
    useWaitForTransactionReceipt({
      hash: cancelTxHash,
    });

  // Refresh on transaction completion
  useEffect(() => {
    if (isClaimSuccess || isCancelSuccess) {
      refetchGift();
      if (isClaimSuccess) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }
  }, [isClaimSuccess, isCancelSuccess, refetchGift]);

  // Countdown timer calculation
  useEffect(() => {
    if (!giftData) return;

    const unlockTimeMs = Number(giftData.unlockTime) * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = unlockTimeMs - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [giftData]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isGiftLoading) {
    return (
      <div className="w-full max-w-xl mx-auto p-12 text-center bg-[#0f1422]/90 border border-gray-800 rounded-2xl">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading StonkGift #{giftId} from Base...</p>
      </div>
    );
  }

  if (giftError || !giftData || giftData.sender === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center bg-[#0f1422]/90 border border-gray-800 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Gift #{giftId} Not Found</h2>
        <p className="text-gray-400 text-sm mb-6">
          This gift has not been created yet or does not exist on this network.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
        >
          Create a New Gift
        </Link>
      </div>
    );
  }

  const {
    sender,
    recipient,
    token,
    amount,
    unlockTime,
    claimed,
    cancelled,
    message,
  } = giftData;

  // Identify token metadata
  const stockMeta =
    SUPPORTED_STOCKS.find(
      (s) =>
        s.addresses.base.toLowerCase() === token.toLowerCase() ||
        s.addresses.baseSepolia.toLowerCase() === token.toLowerCase()
    ) || {
      name: "Tokenized Stock",
      symbol: "NVDA",
      decimals: 18,
      logo: "🟩",
      color: "#76B900",
    };

  const formattedAmount = formatUnits(amount, stockMeta.decimals);
  const isInstantGift = Number(unlockTime) === 0;
  const unlockDate = new Date(Number(unlockTime) * 1000);
  const isSender = address && address.toLowerCase() === sender.toLowerCase();
  const isRecipient = address && address.toLowerCase() === recipient.toLowerCase();

  // Status computation
  let statusBadge = {
    label: "Locked",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: Lock,
  };

  if (claimed) {
    statusBadge = {
      label: "Claimed",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
      icon: CheckCircle,
    };
  } else if (cancelled) {
    statusBadge = {
      label: "Cancelled",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
      icon: XCircle,
    };
  } else if (isInstantGift) {
    statusBadge = {
      label: "No Lock",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
      icon: Sparkles,
    };
  } else if (timeLeft.isPast) {
    statusBadge = {
      label: "Claimable",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse-subtle",
      icon: Unlock,
    };
  }

  const canClaim = !claimed && !cancelled && (isInstantGift || timeLeft.isPast) && isRecipient;
  const canCancel = !claimed && !cancelled && !isInstantGift && !timeLeft.isPast && isSender;

  const handleClaim = () => {
    writeClaim({
      address: contractAddress,
      abi: STONK_GIFT_ABI,
      functionName: "claimGift",
      args: [BigInt(giftId)],
    });
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this gift and retrieve your deposited stock tokens?")) {
      writeCancel({
        address: contractAddress,
        abi: STONK_GIFT_ABI,
        functionName: "cancelGift",
        args: [BigInt(giftId)],
      });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-[#0f1422]/90 border border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-2xl">
            {stockMeta.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">StonkGift #{giftId}</h1>
              <button
                onClick={() => copyToClipboard(window.location.href, "url")}
                className="text-gray-400 hover:text-white transition p-1"
                title="Copy share link"
              >
                {copiedField === "url" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400">{stockMeta.name} on Base</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusBadge.color}`}>
          <statusBadge.icon className="w-3.5 h-3.5" />
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* Asset Amount Hero */}
      <div className="p-5 rounded-xl bg-gray-950/60 border border-gray-800/70 mb-6 text-center">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
          GIFTED ASSET
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
          <span>{formattedAmount}</span>
          <span className="text-blue-400">{stockMeta.symbol}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Tokenized equity custodied onchain</p>
      </div>

      {/* Personal Message */}
      {message && (
        <div className="mb-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-1">
            GIFT NOTE
          </span>
          <p className="text-sm text-gray-200 italic">“{message}”</p>
        </div>
      )}

      {/* Instant Gift Banner (when no lock) */}
      {!claimed && !cancelled && isInstantGift && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Gift (No Lock)</span>
          </div>
          <p className="text-xs text-gray-300">
            This gift has no time lock and can be claimed immediately by the recipient.
          </p>
        </div>
      )}

      {/* Countdown Timer (if locked) */}
      {!claimed && !cancelled && !isInstantGift && !timeLeft.isPast && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>Unlocks In</span>
          </div>
          <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
            <div className="bg-gray-900/90 p-2 rounded-lg border border-gray-800">
              <span className="text-lg font-bold text-white block">{timeLeft.days}</span>
              <span className="text-[10px] text-gray-400 uppercase">Days</span>
            </div>
            <div className="bg-gray-900/90 p-2 rounded-lg border border-gray-800">
              <span className="text-lg font-bold text-white block">{timeLeft.hours}</span>
              <span className="text-[10px] text-gray-400 uppercase">Hours</span>
            </div>
            <div className="bg-gray-900/90 p-2 rounded-lg border border-gray-800">
              <span className="text-lg font-bold text-white block">{timeLeft.minutes}</span>
              <span className="text-[10px] text-gray-400 uppercase">Mins</span>
            </div>
            <div className="bg-gray-900/90 p-2 rounded-lg border border-gray-800">
              <span className="text-lg font-bold text-white block">{timeLeft.seconds}</span>
              <span className="text-[10px] text-gray-400 uppercase">Secs</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Unlocks on {unlockDate.toLocaleDateString()} at {unlockDate.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Details List */}
      <div className="space-y-3 mb-6 text-sm">
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800/60">
          <span className="text-xs text-gray-400">Recipient</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-gray-200 text-xs">
              {recipient.slice(0, 8)}...{recipient.slice(-6)}
            </span>
            {isRecipient && (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">
                You
              </span>
            )}
            <button
              onClick={() => copyToClipboard(recipient, "recipient")}
              className="text-gray-400 hover:text-white transition"
            >
              {copiedField === "recipient" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800/60">
          <span className="text-xs text-gray-400">Sender</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-gray-200 text-xs">
              {sender.slice(0, 8)}...{sender.slice(-6)}
            </span>
            {isSender && (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                You
              </span>
            )}
            <button
              onClick={() => copyToClipboard(sender, "sender")}
              className="text-gray-400 hover:text-white transition"
            >
              {copiedField === "sender" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800/60">
          <span className="text-xs text-gray-400">Unlock Schedule</span>
          <span className="font-mono text-gray-200 text-xs">
            {isInstantGift ? "Immediate (No Lock)" : `${unlockDate.toLocaleDateString()} at ${unlockDate.toLocaleTimeString()}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {canClaim && (
          <button
            onClick={handleClaim}
            disabled={isClaimPending || isClaimConfirming}
            className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 disabled:opacity-50"
          >
            {isClaimPending || isClaimConfirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Claiming Gift...
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Claim Gift ({formattedAmount} {stockMeta.symbol})
              </>
            )}
          </button>
        )}

        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={isCancelPending || isCancelConfirming}
            className="w-full py-3 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCancelPending || isCancelConfirming ? (
              <>
                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                Cancelling Gift...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Cancel Gift & Retrieve Tokens
              </>
            )}
          </button>
        )}

        {/* Helpful status hints */}
        {!claimed && !cancelled && !isRecipient && !isSender && (
          <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 text-center text-xs text-gray-400">
            {isInstantGift || timeLeft.isPast ? (
              <span>
                This gift is claimable by recipient <span className="font-mono text-gray-300">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>. Connect with that wallet to claim.
              </span>
            ) : (
              <span>
                This gift unlocks on <span className="text-gray-300">{unlockDate.toLocaleDateString()}</span> for recipient <span className="font-mono text-gray-300">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>.
              </span>
            )}
          </div>
        )}

        {isSender && isInstantGift && !claimed && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center text-xs text-blue-300">
            You sent this as an instant gift. It is immediately claimable by the recipient and cannot be cancelled.
          </div>
        )}

        {claimed && (
          <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-center text-xs text-green-300 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            This gift was successfully claimed by the recipient.
          </div>
        )}

        {cancelled && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-xs text-red-300 flex items-center justify-center gap-2">
            <XCircle className="w-4 h-4" />
            This gift was cancelled by the sender before unlock and refunded.
          </div>
        )}
      </div>
    </div>
  );
}
