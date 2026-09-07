"use client";

import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Check,
  Share2,
  Download,
  ExternalLink,
  X,
  Sparkles,
  ShieldCheck,
  Send,
} from "lucide-react";
import { StockIcon } from "./StockIcon";

interface ShareGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftId: string;
  claimUrl: string;
  stockSymbol: string;
  stockName: string;
  amount: string;
  message?: string;
}

export function ShareGiftModal({
  isOpen,
  onClose,
  giftId,
  claimUrl,
  stockSymbol,
  stockName,
  amount,
  message,
}: ShareGiftModalProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = `🎁 I sent you ${amount} of ${stockName} (${stockSymbol}) stock on Base! Claim it with zero gas fees using your Face ID / Passkey:`;

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 32, 32, 448, 448);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `StonkGift-${stockSymbol}-#${giftId}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c1017] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Shareable Link Gift Created!</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Share Your StonkGift
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Anyone with this link or QR code can claim the stock directly into their Coinbase Smart Wallet with zero gas fees.
          </p>
        </div>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner mx-auto mb-6 max-w-xs">
          <QRCodeSVG
            ref={qrRef}
            value={claimUrl}
            size={220}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "/nvda_200x200.webp", // Fallback center logo
              x: undefined,
              y: undefined,
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
          <div className="flex items-center gap-2 mt-3">
            <StockIcon symbol={stockSymbol} size={20} />
            <span className="text-xs font-bold text-zinc-900 font-mono">
              {amount} {stockSymbol}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5">Scan to claim on Base</span>
        </div>

        {/* Claim Link Input */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Claim URL (Contains Secret Claim Key)
          </label>
          <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-2 pl-4">
            <input
              type="text"
              readOnly
              value={claimUrl}
              className="bg-transparent text-xs text-zinc-300 font-mono flex-1 outline-none truncate select-all"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="mb-6">
          <span className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
            Share Directly
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `${shareText}\n\n${claimUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition"
            >
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(
                claimUrl
              )}&text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition"
            >
              <span>Telegram</span>
            </a>

            {/* X / Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                shareText
              )}&url=${encodeURIComponent(claimUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition"
            >
              <span>X (Twitter)</span>
            </a>

            {/* Download QR Card */}
            <button
              onClick={handleDownloadQR}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save QR</span>
            </button>
          </div>
        </div>

        {/* Security / Non-Crypto Helper Banner */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-zinc-200 font-medium block">
              Non-Crypto Recipient Friendly
            </span>
            The recipient does not need an existing wallet or ETH. When they open the link, Coinbase Smart Wallet lets them sign in via Face ID / Touch ID and claim 100% gas-free.
          </div>
        </div>
      </div>
    </div>
  );
}
