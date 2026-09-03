"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, isAddress } from "viem";
import { SUPPORTED_STOCKS, TokenizedStock, DEFAULT_STOCK } from "@/lib/tokens";
import { STONK_GIFT_ABI, ERC20_ABI } from "@/lib/abi";
import { getStonkGiftAddress } from "@/lib/contract";
import confetti from "canvas-confetti";
import {
  Gift,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Coins,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export function CreateGift() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getStonkGiftAddress(chainId);

  // Form State
  const [selectedStock, setSelectedStock] = useState<TokenizedStock>(DEFAULT_STOCK);
  const [amount, setAmount] = useState<string>("0.05"); // Default 0.05 from buildplan
  const [recipient, setRecipient] = useState<string>("");
  const [unlockDateTime, setUnlockDateTime] = useState<string>("");
  const [message, setMessage] = useState<string>("A gift for the future! 🚀");
  const [createdGiftId, setCreatedGiftId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Set default unlock date to 7 days from now
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setUnlockDateTime(d.toISOString().slice(0, 16));
  }, []);

  // Determine current active token address for selected stock on current network
  const tokenAddress =
    chainId === 8453
      ? selectedStock.addresses.base
      : chainId === 84532
      ? selectedStock.addresses.baseSepolia
      : selectedStock.addresses.localhost;

  // Read Token Balance
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read Token Allowance for StonkGift contract
  const { data: rawAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, contractAddress] : undefined,
  });

  const parsedAmount = (() => {
    try {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return BigInt(0);
      return parseUnits(amount, selectedStock.decimals);
    } catch {
      return BigInt(0);
    }
  })();

  const tokenBalanceFormatted = rawBalance !== undefined
    ? Number(formatUnits(rawBalance, selectedStock.decimals)).toFixed(4)
    : "0.00";

  const needsApproval =
    rawAllowance !== undefined &&
    parsedAmount > BigInt(0) &&
    rawAllowance < parsedAmount;

  // Approve Transaction
  const {
    data: approveTxHash,
    isPending: isApprovePending,
    writeContract: writeApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
    });

  // Create Gift Transaction
  const {
    data: createGiftTxHash,
    isPending: isCreateGiftPending,
    writeContract: writeCreateGift,
  } = useWriteContract();

  const {
    data: createReceipt,
    isLoading: isCreateGiftConfirming,
    isSuccess: isCreateGiftSuccess,
  } = useWaitForTransactionReceipt({
    hash: createGiftTxHash,
  });

  // Faucet Transaction (for test stocks)
  const {
    data: faucetTxHash,
    isPending: isFaucetPending,
    writeContract: writeFaucet,
  } = useWriteContract();

  const { isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({
    hash: faucetTxHash,
  });

  // Refresh data on approvals or creates
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isFaucetSuccess) {
      refetchBalance();
    }
  }, [isFaucetSuccess, refetchBalance]);

  // Handle gift created receipt to extract Gift ID from logs
  useEffect(() => {
    if (isCreateGiftSuccess && createReceipt) {
      refetchBalance();
      refetchAllowance();

      // Extract giftId from logs or fallback
      let id = "1";
      if (createReceipt.logs && createReceipt.logs.length > 0) {
        try {
          const firstTopic = createReceipt.logs[createReceipt.logs.length - 1].topics[1];
          if (firstTopic) {
            id = BigInt(firstTopic).toString();
          }
        } catch {
          id = "1";
        }
      }
      setCreatedGiftId(id);

      // Trigger celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isCreateGiftSuccess, createReceipt, refetchBalance, refetchAllowance]);

  // Quick unlock presets
  const applyTimePreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setUnlockDateTime(d.toISOString().slice(0, 16));
  };

  const handleApprove = () => {
    if (!tokenAddress || parsedAmount <= BigInt(0)) return;
    writeApprove({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddress, parseUnits("1000000", selectedStock.decimals)],
    });
  };

  const handleCreateGift = () => {
    if (!tokenAddress || parsedAmount <= BigInt(0) || !isAddress(recipient)) return;

    const unlockTimestamp = BigInt(Math.floor(new Date(unlockDateTime).getTime() / 1000));
    const nowTimestamp = BigInt(Math.floor(Date.now() / 1000));

    if (unlockTimestamp <= nowTimestamp) {
      alert("Unlock time must be in the future!");
      return;
    }

    writeCreateGift({
      address: contractAddress,
      abi: STONK_GIFT_ABI,
      functionName: "createGift",
      args: [tokenAddress, parsedAmount, recipient as `0x${string}`, unlockTimestamp, message],
    });
  };

  const handleFaucet = () => {
    if (!address || !tokenAddress) return;
    writeFaucet({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "faucet",
      args: [address, parseUnits("10", selectedStock.decimals)],
    });
  };

  const copyShareLink = () => {
    if (!createdGiftId) return;
    const url = `${window.location.origin}/gift/${createdGiftId}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const isValidRecipient = recipient.length > 0 && isAddress(recipient);
  const unlockInFuture = unlockDateTime
    ? new Date(unlockDateTime).getTime() > Date.now()
    : false;

  const canSubmit =
    isConnected &&
    parsedAmount > BigInt(0) &&
    isValidRecipient &&
    unlockInFuture &&
    !needsApproval;

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Success Modal / Card */}
      {createdGiftId && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-b from-blue-950/60 to-gray-900 border border-blue-500/30 shadow-2xl animate-fade-in text-center">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-500/40">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Gift #{createdGiftId} Created!
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Your {amount} {selectedStock.symbol} has been deposited into the smart contract and time-locked for{" "}
            <span className="text-gray-200 font-mono">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>.
          </p>

          <div className="p-3 bg-gray-950/80 rounded-xl border border-gray-800 flex items-center justify-between gap-2 mb-6">
            <span className="text-sm font-mono text-gray-300 truncate">
              {typeof window !== "undefined" ? `${window.location.origin}/gift/${createdGiftId}` : `/gift/${createdGiftId}`}
            </span>
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              {copySuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copySuccess ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/gift/${createdGiftId}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-600/30"
            >
              View Gift Details
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                setCreatedGiftId(null);
                setAmount("0.05");
                setRecipient("");
              }}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition"
            >
              Send Another Gift
            </button>
          </div>
        </div>
      )}

      {/* Main Creation Card */}
      <div className="bg-[#0f1422]/90 border border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-400" />
              Create StonkGift
            </h1>
            <p className="text-sm text-gray-400">Lock tokenized stock on Base as a timed gift</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            Step 1 of 2
          </span>
        </div>

        <div className="space-y-5">
          {/* Stock Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Select Tokenized Stock
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {SUPPORTED_STOCKS.map((stock) => {
                const isSelected = selectedStock.symbol === stock.symbol;
                return (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => setSelectedStock(stock)}
                    className={`p-3 rounded-xl border text-left flex flex-col transition ${
                      isSelected
                        ? "bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500"
                        : "bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-gray-900"
                    }`}
                  >
                    <span className="text-xl mb-1">{stock.logo}</span>
                    <span className="font-bold text-sm text-gray-200">{stock.symbol}</span>
                    <span className="text-xs text-gray-400 truncate">{stock.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <span>Amount ({selectedStock.symbol})</span>
              <div className="flex items-center gap-2 normal-case font-normal text-gray-400">
                <span>Balance: {tokenBalanceFormatted} {selectedStock.symbol}</span>
                {Number(tokenBalanceFormatted) === 0 && (
                  <button
                    type="button"
                    onClick={handleFaucet}
                    disabled={isFaucetPending}
                    className="text-xs text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1"
                  >
                    <Coins className="w-3 h-3" />
                    {isFaucetPending ? "Minting..." : "Faucet (+10)"}
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.0001"
                placeholder="0.05"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-900/90 text-white font-mono text-lg px-4 py-3 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 transition"
              />
              <div className="absolute right-3 top-3 flex items-center gap-1">
                {["0.01", "0.05", "0.1", "0.5"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Recipient Wallet Address (Base)
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              className={`w-full bg-gray-900/90 text-white font-mono text-sm px-4 py-3 rounded-xl border transition focus:outline-none ${
                recipient && !isValidRecipient
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-800 focus:border-blue-500"
              }`}
            />
            {recipient && !isValidRecipient && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Please enter a valid Ethereum / Base address.
              </p>
            )}
          </div>

          {/* Unlock Date & Time */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <span>Unlock Date & Time</span>
              <span className="text-xs font-normal normal-case text-gray-400">Recipient cannot claim before this</span>
            </div>
            <div className="relative mb-2">
              <input
                type="datetime-local"
                value={unlockDateTime}
                onChange={(e) => setUnlockDateTime(e.target.value)}
                className="w-full bg-gray-900/90 text-white px-4 py-3 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 transition text-sm"
              />
            </div>
            {/* Quick date presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyTimePreset(1)}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition"
              >
                +1 Day
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset(7)}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset(30)}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition"
              >
                +1 Month
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset(365)}
                className="text-xs px-2.5 py-1 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition"
              >
                +1 Year
              </button>
            </div>
          </div>

          {/* Personal Gift Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Gift Message (Onchain)
            </label>
            <textarea
              rows={2}
              maxLength={200}
              placeholder="Add a congratulatory note, birthday wish, or investment advice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-gray-900/90 text-white text-sm px-4 py-3 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {!isConnected ? (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center text-sm text-blue-300">
                Please connect your wallet on Base to create a gift.
              </div>
            ) : needsApproval ? (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApprovePending || isApproveConfirming}
                className="w-full py-3.5 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50"
              >
                {isApprovePending || isApproveConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                    Approving {selectedStock.symbol}...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Step 1: Approve {selectedStock.symbol}
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateGift}
                disabled={!canSubmit || isCreateGiftPending || isCreateGiftConfirming}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCreateGiftPending || isCreateGiftConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Gift on Base...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Create Gift ({amount} {selectedStock.symbol})
                  </>
                )}
              </button>
            )}
          </div>

          {/* Helpful Tip */}
          <p className="text-center text-xs text-gray-400">
            🔒 Tokens are custodied by the verified StonkGift smart contract. You can cancel and reclaim them anytime before the unlock date.
          </p>
        </div>
      </div>
    </div>
  );
}
