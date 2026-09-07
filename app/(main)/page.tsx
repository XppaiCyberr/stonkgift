import { CreateGift } from "@/components/CreateGift";
import { Lock, Sparkles, Shield, Clock, TrendingUp, ArrowUpRight } from "lucide-react";
import { StockIcon } from "@/components/StockIcon";

export default function Home() {
  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero Header */}
      <section className="text-center max-w-2xl mx-auto pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium mb-5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live on Base Mainnet</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Gift Tokenized Stocks <br className="hidden sm:block" />
          with Smart Escrow
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Send Coinbase tokenized equities like NVIDIA, Apple, and Google. Lock them until a future date or send as an instant gift.
        </p>

        {/* Supported Stocks Bar */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {[
            { symbol: "NVDAc", name: "Nvidia" },
            { symbol: "AAPLc", name: "Apple" },
            { symbol: "GOOGLc", name: "Google" },
            { symbol: "METAc", name: "Meta" },
          ].map((stock) => (
            <div
              key={stock.symbol}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300"
            >
              <StockIcon symbol={stock.symbol} size={16} />
              <span className="font-semibold">{stock.symbol}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Main Interactive Create Gift Form */}
      <section>
        <CreateGift />
      </section>

      {/* Protocol Architecture Features */}
      <section className="max-w-4xl mx-auto pt-10 border-t border-zinc-800/80">
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold text-white tracking-tight mb-1">How StonkGift Works</h2>
          <p className="text-xs text-zinc-400">Non-custodial, transparent smart contract escrow on Base.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-[#0c1017] border border-zinc-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">1. Choose & Lock</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Select a Coinbase tokenized equity and specify an unlock timestamp or create an instantly claimable gift.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c1017] border border-zinc-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">2. Smart Escrow</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tokens are held onchain by verified protocol contracts. Senders can cancel and reclaim anytime before unlock.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c1017] border border-zinc-800/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">3. Claim & Reclaim</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Recipients claim directly to their wallet with 1-click. If left unclaimed after 180 days, senders can safely reclaim.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
