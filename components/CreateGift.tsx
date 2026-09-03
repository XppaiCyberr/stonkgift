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
  Sparkles,
  ArrowRight,
  ShieldCheck,
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
  const [isTimeLocked, setIsTimeLocked] = useState<boolean>(true);
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

  // Official Coinbase Tokenized Stock contract address on Base Mainnet
  const tokenAddress = selectedStock.address;

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

  // Check if selected stock is whitelisted on StonkGift contract
  const { data: isTokenWhitelisted, refetch: refetchWhitelist } = useReadContract({
    address: contractAddress,
    abi: STONK_GIFT_ABI,
    functionName: "supportedTokens",
    args: [tokenAddress],
  });

  // Read Contract Owner
  const { data: contractOwner } = useReadContract({
    address: contractAddress,
    abi: STONK_GIFT_ABI,
    functionName: "owner",
  });

  const isOwner = Boolean(
    address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase()
  );

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

  const isContractConfigured =
    contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000";

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

  // Whitelist Transaction (for Contract Owner)
  const {
    data: whitelistTxHash,
    isPending: isWhitelistPending,
    writeContract: writeWhitelist,
  } = useWriteContract();

  const { isLoading: isWhitelistConfirming, isSuccess: isWhitelistSuccess } =
    useWaitForTransactionReceipt({
      hash: whitelistTxHash,
    });

  // Refresh data on approvals or whitelist
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isWhitelistSuccess) {
      refetchWhitelist();
    }
  }, [isWhitelistSuccess, refetchWhitelist]);

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
    if (!tokenAddress || !isContractConfigured || parsedAmount <= BigInt(0)) return;
    writeApprove({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddress, parsedAmount],
    });
  };

  const handleWhitelistStock = () => {
    if (!tokenAddress || !isContractConfigured || !isOwner) return;
    writeWhitelist({
      address: contractAddress,
      abi: STONK_GIFT_ABI,
      functionName: "setSupportedToken",
      args: [tokenAddress, true],
    });
  };

  const handleCreateGift = () => {
    if (!tokenAddress || parsedAmount <= BigInt(0) || !isAddress(recipient)) return;

    const unlockTimestamp = isTimeLocked
      ? BigInt(Math.floor(new Date(unlockDateTime).getTime() / 1000))
      : BigInt(0);

    const nowTimestamp = BigInt(Math.floor(Date.now() / 1000));

    if (isTimeLocked && unlockTimestamp <= nowTimestamp) {
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

  const copyShareLink = () => {
    if (!createdGiftId) return;
    const url = `${window.location.origin}/gift/${createdGiftId}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const isValidRecipient = recipient.length > 0 && isAddress(recipient);
  const unlockValid = !isTimeLocked || (unlockDateTime ? new Date(unlockDateTime).getTime() > Date.now() : false);

  const canSubmit =
    isConnected &&
    Boolean(isContractConfigured) &&
    isTokenWhitelisted !== false &&
    parsedAmount > BigInt(0) &&
    isValidRecipient &&
    unlockValid &&
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
            Your {amount} {selectedStock.symbol} has been deposited into the smart contract and {isTimeLocked ? "time-locked" : "gifted"} for{" "}
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
            <p className="text-sm text-gray-400">Lock Coinbase tokenized stocks on Base as a gift</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            Base Mainnet
          </span>
        </div>

        <div className="space-y-5">
          {/* Stock Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Select Coinbase Tokenized Stock
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
              <span className="normal-case font-normal text-gray-400">
                Wallet Balance: <strong className="text-gray-200">{tokenBalanceFormatted}</strong> {selectedStock.symbol}
              </span>
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
                Please enter a valid Base address.
              </p>
            )}
          </div>

          {/* Gift Lock Type Option */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Gift Lock Type
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsTimeLocked(true)}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  isTimeLocked
                    ? "bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500"
                    : "bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-gray-200">Time-Locked</span>
                  <span className="text-[11px] text-gray-400 block">Unlocks on date</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsTimeLocked(false)}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  !isTimeLocked
                    ? "bg-green-600/10 border-green-500 text-white ring-1 ring-green-500"
                    : "bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-gray-200">No Lock</span>
                  <span className="text-[11px] text-gray-400 block">Instant unlock</span>
                </div>
              </button>
            </div>

            {/* Unlock Date & Time (only when time-locked) */}
            {isTimeLocked ? (
              <div className="p-3.5 rounded-xl bg-gray-900/50 border border-gray-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  <span>Unlock Date & Time</span>
                  <span className="text-xs font-normal normal-case text-gray-400">Recipient cannot claim before this</span>
                </div>
                <input
                  type="datetime-local"
                  value={unlockDateTime}
                  onChange={(e) => setUnlockDateTime(e.target.value)}
                  className="w-full bg-gray-900/90 text-white px-4 py-2.5 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 transition text-sm"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
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
            ) : (
              <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-300 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>Instant Gift: The recipient can claim this tokenized stock immediately upon receiving the gift link.</span>
              </div>
            )}
          </div>

          {/* Personal Gift Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Gift Message (Onchain)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Add a congratulatory note, birthday wish, or investment advice... (max 500 chars)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-gray-900/90 text-white text-sm px-4 py-3 rounded-xl border border-gray-800 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            {/* Whitelist Banner & Action */}
            {isContractConfigured && isTokenWhitelisted === false && (
              isOwner ? (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-300">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Contract Owner Action Required</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    You are connected as the contract owner. Whitelist {selectedStock.name} ({selectedStock.symbol}) so users can create gifts with it.
                  </p>
                  <button
                    type="button"
                    onClick={handleWhitelistStock}
                    disabled={isWhitelistPending || isWhitelistConfirming}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    {isWhitelistPending || isWhitelistConfirming ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Whitelisting {selectedStock.symbol} on Base...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Whitelist {selectedStock.symbol} On-Chain Now
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2 text-left">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span>{selectedStock.symbol} Not Whitelisted On-Chain Yet</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    The function <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">setSupportedToken</code> requires the contract owner. Calling it from any other wallet reverts with <code className="text-red-300">OwnableUnauthorizedAccount</code>.
                  </p>
                  <div className="p-2.5 bg-black/40 rounded-lg space-y-1 font-mono text-[11px] text-gray-300">
                    <div>Contract Owner: <span className="text-amber-300 break-all">{contractOwner || "Loading..."}</span></div>
                    <div>Connected Wallet: <span className="text-white break-all">{address || "Not connected"}</span></div>
                  </div>
                  <p className="text-[11px] text-amber-300/90 font-medium">
                    👉 Switch to the contract owner account in your wallet to whitelist this stock with 1 click.
                  </p>
                </div>
              )
            )}

            {!isContractConfigured ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5">
                <p className="text-sm font-semibold text-amber-300 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  StonkGift Contract Not Deployed on Base Mainnet
                </p>
                <p className="text-xs text-gray-300">
                  Please deploy the StonkGift contract to Base and set its address in <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">lib/contract.ts</code>.
                </p>
              </div>
            ) : !isConnected ? (
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
                    Step 1: Approve {amount} {selectedStock.symbol}
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
            🔒 Tokens are custodied by the verified StonkGift smart contract on Base. You can cancel and reclaim them anytime before the unlock date.
          </p>
        </div>
      </div>
    </div>
  );
}
