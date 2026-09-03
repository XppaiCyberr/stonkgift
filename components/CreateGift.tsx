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
import { StockIcon } from "./StockIcon";
import { GiftSuccessModal } from "./GiftSuccessModal";
import confetti from "canvas-confetti";
import {
  Gift,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Lock,
} from "lucide-react";

export function CreateGift() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getStonkGiftAddress(chainId);

  // Form State
  const [selectedStock, setSelectedStock] = useState<TokenizedStock>(DEFAULT_STOCK);
  const [amount, setAmount] = useState<string>("0.05");
  const [recipient, setRecipient] = useState<string>("");
  const [unlockDateTime, setUnlockDateTime] = useState<string>("");
  const [isTimeLocked, setIsTimeLocked] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("A gift for the future! 🚀");
  const [createdGiftId, setCreatedGiftId] = useState<string | null>(null);

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

  const handleAmountChange = (val: string) => {
    // Convert comma to dot
    let sanitized = val.replace(",", ".");
    // Allow digits and at most one dot
    if (sanitized === "" || /^[0-9]*\.?[0-9]*$/.test(sanitized)) {
      // Enforce max token decimals
      const parts = sanitized.split(".");
      if (parts[1] && parts[1].length > selectedStock.decimals) {
        sanitized = `${parts[0]}.${parts[1].slice(0, selectedStock.decimals)}`;
      }
      setAmount(sanitized);
    }
  };

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

  const isInsufficientBalance =
    rawBalance !== undefined && parsedAmount > rawBalance;

  const isContractConfigured =
    contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000";

  const needsApproval =
    rawAllowance !== undefined &&
    parsedAmount > BigInt(0) &&
    !isInsufficientBalance &&
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

  // Handle gift created receipt to extract Gift ID from logs & show dialog
  useEffect(() => {
    if (isCreateGiftSuccess && createReceipt) {
      refetchBalance();
      refetchAllowance();

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

      // Trigger celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
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

  const isValidRecipient = recipient.length > 0 && isAddress(recipient);
  const unlockValid = !isTimeLocked || (unlockDateTime ? new Date(unlockDateTime).getTime() > Date.now() : false);

  const canSubmit =
    isConnected &&
    Boolean(isContractConfigured) &&
    isTokenWhitelisted !== false &&
    parsedAmount > BigInt(0) &&
    !isInsufficientBalance &&
    isValidRecipient &&
    unlockValid &&
    !needsApproval;

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Interactive Success Modal / Dialog */}
      {createdGiftId && (
        <GiftSuccessModal
          giftId={createdGiftId}
          stock={selectedStock}
          amount={amount}
          recipient={recipient}
          isTimeLocked={isTimeLocked}
          unlockDateTime={unlockDateTime}
          onClose={() => {
            setCreatedGiftId(null);
            setAmount("0.05");
            setRecipient("");
          }}
        />
      )}

      {/* Main Creation Card */}
      <div className="bg-[#0c1017] border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Create a StonkGift</h1>
              <p className="text-xs text-zinc-400">Lock tokenized equity on Base as a programmable gift</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Base Mainnet
          </span>
        </div>

        <div className="space-y-6">
          {/* Stock Selection */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <span>Select Stock</span>
              <span className="text-[11px] font-normal normal-case text-zinc-500">Coinbase Equities</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUPPORTED_STOCKS.map((stock) => {
                const isSelected = selectedStock.symbol === stock.symbol;
                return (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => setSelectedStock(stock)}
                    className={`py-2 px-2.5 rounded-xl border flex items-center gap-2 transition-all duration-150 ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500 shadow-sm ring-1 ring-blue-500/40"
                        : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700"
                    }`}
                  >
                    <StockIcon symbol={stock.symbol} size={22} />
                    <div className="text-left min-w-0 flex-1">
                      <span className={`block font-bold text-xs tracking-tight ${isSelected ? "text-white" : "text-zinc-300"}`}>
                        {stock.symbol}
                      </span>
                      <span className="block text-[10px] text-zinc-500 truncate leading-tight">
                        {stock.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <span>Amount ({selectedStock.symbol})</span>
              <div className="flex items-center gap-1.5 normal-case font-normal text-xs">
                <span className="text-zinc-500">Balance:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (rawBalance !== undefined) {
                      setAmount(formatUnits(rawBalance, selectedStock.decimals));
                    }
                  }}
                  className="text-zinc-200 hover:text-blue-400 font-mono font-medium transition underline-offset-2 hover:underline"
                  title="Click to use full balance"
                >
                  {tokenBalanceFormatted} {selectedStock.symbol}
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.05"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`w-full bg-zinc-900/90 text-white font-mono text-xl pl-4 pr-24 py-3 rounded-2xl border transition focus:outline-none ${
                  isInsufficientBalance
                    ? "border-red-500/80 focus:border-red-500"
                    : "border-zinc-800 focus:border-blue-500"
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (rawBalance !== undefined) {
                      setAmount(formatUnits(rawBalance, selectedStock.decimals));
                    }
                  }}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition"
                >
                  MAX
                </button>
                <span className="text-xs font-bold text-zinc-300 font-mono">
                  {selectedStock.symbol}
                </span>
              </div>
            </div>

            {/* Quick Presets & Balance Warning Row */}
            <div className="flex items-center justify-between mt-2 text-xs">
              {isInsufficientBalance ? (
                <span className="text-red-400 flex items-center gap-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Exceeds balance ({tokenBalanceFormatted} {selectedStock.symbol})
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  Min: 0.0001 {selectedStock.symbol}
                </span>
              )}

              <div className="flex items-center gap-1 ml-auto">
                {["0.01", "0.05", "0.1", "0.5"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition font-medium ${
                      amount === preset
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Recipient Address (Base)
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              className={`w-full bg-zinc-900/90 text-white font-mono text-sm px-4 py-3 rounded-2xl border transition focus:outline-none ${
                recipient && !isValidRecipient
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-800 focus:border-blue-500"
              }`}
            />
            {recipient && !isValidRecipient && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Please enter a valid Base Ethereum address.
              </p>
            )}
          </div>

          {/* Gift Lock Type Segmented Toggle */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Lock Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsTimeLocked(true)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  isTimeLocked
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Time-Locked</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTimeLocked(false)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  !isTimeLocked
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant (No Lock)</span>
              </button>
            </div>

            {/* Unlock Date & Time (when time-locked) */}
            {isTimeLocked ? (
              <div className="mt-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <span>Unlock Schedule</span>
                  <span className="text-[11px] font-normal normal-case text-zinc-500">Recipient cannot claim before this</span>
                </div>
                <input
                  type="datetime-local"
                  value={unlockDateTime}
                  onChange={(e) => setUnlockDateTime(e.target.value)}
                  className="w-full bg-zinc-900 text-white px-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-blue-500 transition text-sm font-mono"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-xs text-zinc-500 mr-1">Presets:</span>
                  {[
                    { label: "+1 Day", days: 1 },
                    { label: "+1 Week", days: 7 },
                    { label: "+1 Month", days: 30 },
                    { label: "+1 Year", days: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyTimePreset(preset.days)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition font-medium"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Instant Gift: The recipient can claim this stock immediately upon receiving the link.</span>
              </div>
            )}
          </div>

          {/* Personal Gift Note */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <span>Personal Gift Note</span>
              <span className="text-[11px] font-normal normal-case text-zinc-500">{message.length}/500</span>
            </div>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Add a congratulatory note or birthday wish..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-zinc-900/90 text-white text-sm px-4 py-3 rounded-2xl border border-zinc-800 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            {/* Whitelist Banner & Action */}
            {isContractConfigured && isTokenWhitelisted === false && (
              isOwner ? (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-center space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-300">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Contract Owner Action</span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    You are connected as the contract owner. Whitelist {selectedStock.name} ({selectedStock.symbol}) on-chain.
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
                        Whitelisting {selectedStock.symbol}...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Whitelist {selectedStock.symbol} Now
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2 text-left">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span>{selectedStock.symbol} Not Whitelisted Yet</span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    The contract owner must whitelist this token on the StonkGift contract before gifts can be created.
                  </p>
                  <div className="p-2.5 bg-black/40 rounded-xl space-y-1 font-mono text-[11px] text-zinc-300">
                    <div>Owner: <span className="text-amber-300 break-all">{contractOwner || "0x666d...666"}</span></div>
                    <div>Connected: <span className="text-white break-all">{address || "Not connected"}</span></div>
                  </div>
                </div>
              )
            )}

            {!isContractConfigured ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5">
                <p className="text-sm font-semibold text-amber-300 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  StonkGift Contract Not Deployed on Base Mainnet
                </p>
                <p className="text-xs text-zinc-400">
                  Please deploy the StonkGift contract to Base and set its address in <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">lib/contract.ts</code>.
                </p>
              </div>
            ) : !isConnected ? (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center text-sm text-blue-300 font-medium">
                Please connect your wallet to create a StonkGift.
              </div>
            ) : isInsufficientBalance ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 text-zinc-500 border border-zinc-800 font-bold text-sm cursor-not-allowed"
              >
                Insufficient {selectedStock.symbol} Balance
              </button>
            ) : needsApproval ? (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApprovePending || isApproveConfirming}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 disabled:opacity-50"
              >
                {isApprovePending || isApproveConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
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

          <p className="text-center text-xs text-zinc-500">
            🔒 Escrowed non-custodially on Base. Senders can reclaim anytime before unlock.
          </p>
        </div>
      </div>
    </div>
  );
}
