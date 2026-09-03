import { CreateGift } from "@/components/CreateGift";
import { Gift, Lock, Sparkles, Shield, Clock, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center max-w-2xl mx-auto pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The First Time-Locked Stock Gifting Protocol on Base</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Turn Tokenized Stocks into{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-green-400 bg-clip-text text-transparent">
            Programmable Gifts
          </span>
        </h1>
        <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
          Deposit supported tokenized equities like <strong className="text-gray-200">NVDA</strong>, set a future unlock date, and send a gift that grows with the market.
        </p>
      </section>

      {/* Main Interactive Create Gift Form */}
      <section>
        <CreateGift />
      </section>

      {/* How It Works Section */}
      <section className="max-w-4xl mx-auto pt-8 border-t border-gray-800/80">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">How StonkGift Works</h2>
          <p className="text-sm text-gray-400">Simple, non-custodial, and 100% onchain on Base.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white mb-2">1. Deposit & Lock</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Choose a tokenized stock (e.g. 0.05 NVDA), enter the recipient address, and select the unlock timestamp.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white mb-2">2. Custodied Until Unlock</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Tokens are held securely in the StonkGift smart contract. Senders can cancel and reclaim before the unlock date.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-4 border border-green-500/20">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white mb-2">3. Claim Directly</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Once the unlock timestamp passes, the designated recipient can claim the stock directly to their wallet with 1-click.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
