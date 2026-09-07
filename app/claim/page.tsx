"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
} from "wagmi";
import { useWriteContracts, useCapabilities } from "wagmi/experimental";
import { formatUnits, encodePacked, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { STONK_GIFT_ABI } from "@/lib/abi";
import { getStonkGiftAddress } from "@/lib/contract";
import { SUPPORTED_STOCKS } from "@/lib/tokens";
import { StockIcon } from "@/components/StockIcon";
import confetti from "canvas-confetti";
import {
  Gift,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Fingerprint,
} from "lucide-react";
import Link from "next/link";

export default function ClaimGiftPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getStonkGiftAddress(chainId);
  const { openConnectModal } = useConnectModal();
  const { connectors, connect } = useConnect();

  const [giftId, setGiftId] = useState<string | null>(null);
  const [ephemeralKey, setEphemeralKey] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<"idle" | "signing" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse URL hash on mount: #id=123&key=0x...
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const id = params.get("id");
    const key = params.get("key");

    if (id) setGiftId(id);
    if (key) setEphemeralKey(key);
  }, []);

  // Fetch gift details from contract
  const {
    data: giftData,
    isLoading: isGiftLoading,
    error: giftError,
    refetch: refetchGift,
  } = useReadContract({
    address: contractAddress,
    abi: STONK_GIFT_ABI,
    functionName: "getGift",
    args: giftId ? [BigInt(giftId)] : undefined,
  });

  // Check account capabilities for ERC-7677 Paymaster sponsorship
  const { data: capabilities } = useCapabilities({ account: address });
  const hasPaymasterCapability = Boolean(
    chainId && capabilities?.[chainId]?.paymasterService?.supported
  );

  // Wagmi experimental writeContracts (EIP-5792) for smart wallets & paymaster
  const {
    writeContracts,
    data: callBundleId,
    isPending: isWriteContractsPending,
    isSuccess: isWriteContractsSuccess,
    error: writeContractsError,
  } = useWriteContracts();

  // Fallback direct writeContract for standard EOAs
  const {
    writeContract: writeFallbackClaim,
    data: fallbackTxHash,
    isPending: isFallbackPending,
    error: fallbackError,
  } = useWriteContract();

  const { isLoading: isFallbackConfirming, isSuccess: isFallbackSuccess } =
    useWaitForTransactionReceipt({
      hash: fallbackTxHash,
    });

  // Handle success reactions
  useEffect(() => {
    if (isWriteContractsSuccess || isFallbackSuccess) {
      setClaimStatus("success");
      refetchGift();
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.6 },
      });
    }
  }, [isWriteContractsSuccess, isFallbackSuccess, refetchGift]);

  useEffect(() => {
    if (writeContractsError || fallbackError) {
      setClaimStatus("error");
      setErrorMessage(
        writeContractsError?.message || fallbackError?.message || "Transaction failed"
      );
    }
  }, [writeContractsError, fallbackError]);

  const handleConnectSmartWallet = () => {
    // Find Coinbase Wallet connector with smart wallet preference
    const cbConnector = connectors.find(
      (c) => c.id === "coinbase" || c.id === "coinbaseWallet" || c.name.toLowerCase().includes("coinbase")
    );
    if (cbConnector) {
      connect({ connector: cbConnector });
    } else if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleClaimGift = async () => {
    if (!address || !giftId || !ephemeralKey) return;

    try {
      setClaimStatus("signing");
      setErrorMessage(null);

      // 1. Sign claim message with ephemeral private key
      const ephemeralAccount = privateKeyToAccount(ephemeralKey as `0x${string}`);
      const messageHash = keccak256(
        encodePacked(
          ["uint256", "address", "uint256"],
          [BigInt(giftId), address, BigInt(chainId)]
        )
      );

      const signature = await ephemeralAccount.signMessage({
        message: { raw: messageHash },
      });

      setClaimStatus("submitting");

      // 2. Route via Paymaster if supported, otherwise standard tx
      const paymasterUrl = `${window.location.origin}/api/paymaster`;

      if (hasPaymasterCapability) {
        writeContracts({
          contracts: [
            {
              address: contractAddress,
              abi: STONK_GIFT_ABI,
              functionName: "claimGiftWithSignature",
              args: [BigInt(giftId), signature],
            },
          ],
          capabilities: {
            paymasterService: {
              url: paymasterUrl,
            },
          },
        });
      } else {
        // Direct execution (fallback for standard wallets)
        writeFallbackClaim({
          address: contractAddress,
          abi: STONK_GIFT_ABI,
          functionName: "claimGiftWithSignature",
          args: [BigInt(giftId), signature],
        });
      }
    } catch (err: any) {
      console.error("Claim error:", err);
      setClaimStatus("error");
      setErrorMessage(err?.message || "Failed to sign or execute claim");
    }
  };

  // Loading state
  if (isGiftLoading) {
    return (
      <div className="w-full max-w-lg mx-auto p-12 text-center bg-[#0c1017] border border-zinc-800 rounded-3xl">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Opening your StonkGift link...</p>
      </div>
    );
  }

  // Missing link parameters
  if (!giftId || !ephemeralKey) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 text-center bg-[#0c1017] border border-zinc-800 rounded-3xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Invalid Claim Link</h2>
        <p className="text-zinc-400 text-sm mb-6">
          This link appears to be incomplete. Ensure the full URL including the #hash portion is preserved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
        >
          Go to StonkGift Home
        </Link>
      </div>
    );
  }

  // Gift error or not found
  if (giftError || !giftData || giftData.sender === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="w-full max-w-lg mx-auto p-8 text-center bg-[#0c1017] border border-zinc-800 rounded-3xl">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Gift #{giftId} Not Found</h2>
        <p className="text-zinc-400 text-sm mb-6">
          This gift has either expired, was cancelled, or does not exist on Base.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const { sender, token, amount, unlockTime, claimed, cancelled, message } = giftData;

  const stockMeta =
    SUPPORTED_STOCKS.find((s) => s.address.toLowerCase() === token.toLowerCase()) || {
      name: "Tokenized Stock",
      symbol: "STOCK",
      decimals: 8,
      logo: "/nvda_200x200.webp",
      color: "#0052FF",
      address: token as `0x${string}`,
    };

  const formattedAmount = formatUnits(amount, stockMeta.decimals);
  const isInstant = Number(unlockTime) === 0;
  const unlockDate = new Date(Number(unlockTime) * 1000);
  const isLocked = !isInstant && Date.now() < Number(unlockTime) * 1000;
  const isPending = isWriteContractsPending || isFallbackPending || isFallbackConfirming || claimStatus === "signing" || claimStatus === "submitting";

  return (
    <div className="w-full max-w-xl mx-auto bg-[#0c1017] border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Top Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>You Received a StonkGift!</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Claim Your Stock Gift
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Zero gas fees required. Claim straight to your Coinbase Smart Wallet.
        </p>
      </div>

      {/* Hero Asset Card */}
      <div className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 mb-6 text-center">
        <div className="flex justify-center mb-3">
          <StockIcon symbol={stockMeta.symbol} size={54} />
        </div>
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
          GIFTED ASSET
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
          <span>{formattedAmount}</span>
          <span className="text-blue-400">{stockMeta.symbol}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {stockMeta.name} • Coinbase Tokenized Stock on Base
        </p>
      </div>

      {/* Personal Note */}
      {message && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15">
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block mb-1">
            GIFT NOTE
          </span>
          <p className="text-sm text-zinc-200 italic">“{message}”</p>
        </div>
      )}

      {/* Status Banners */}
      {claimed ? (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-400 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>This Gift Has Already Been Claimed!</span>
          </div>
          <p className="text-xs text-zinc-300">
            The stock tokens have been successfully transferred to the recipient wallet.
          </p>
        </div>
      ) : cancelled ? (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-red-400 mb-1">
            <XCircle className="w-4 h-4" />
            <span>Gift Cancelled</span>
          </div>
          <p className="text-xs text-zinc-300">
            This gift was cancelled by the sender and is no longer claimable.
          </p>
        </div>
      ) : isLocked ? (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-400 mb-1">
            <Lock className="w-4 h-4" />
            <span>Time-Locked Gift</span>
          </div>
          <p className="text-xs text-zinc-300">
            This gift matures on {unlockDate.toLocaleDateString()} at {unlockDate.toLocaleTimeString()}.
          </p>
        </div>
      ) : null}

      {/* Claim Actions */}
      {!claimed && !cancelled && (
        <div className="space-y-4">
          {!isConnected ? (
            <div className="space-y-3">
              <button
                onClick={handleConnectSmartWallet}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30"
              >
                <Fingerprint className="w-5 h-5" />
                <span>Continue with Face ID / Passkey</span>
              </button>

              <p className="text-center text-[11px] text-zinc-500">
                Creates or connects a Coinbase Smart Wallet in 5 seconds. No password or seed phrase required.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
                <span>Claiming as:</span>
                <span className="font-mono text-zinc-200">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                </span>
              </div>

              <button
                onClick={handleClaimGift}
                disabled={isPending || isLocked}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {claimStatus === "signing"
                        ? "Verifying Signature..."
                        : "Claiming via Gasless Paymaster..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Claim Stock Gift (Zero Gas Fees ⛽)</span>
                  </>
                )}
              </button>

              {hasPaymasterCapability && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400/90">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% Sponsored by StonkGift Paymaster</span>
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Success banner */}
          {claimStatus === "success" && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Stock Transferred to Your Wallet!</span>
              </div>
              <p className="text-xs text-zinc-300">
                You now own {formattedAmount} of {stockMeta.name} ({stockMeta.symbol}) on Base.
              </p>
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
              >
                <span>View in Portfolio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
