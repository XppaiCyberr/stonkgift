"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Gift, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const [searchId, setSearchId] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/gift/${searchId.trim()}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0f19]/80 border-b border-gray-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span>Stonk</span>
            <span className="text-blue-500">Gift</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Base
            </span>
          </div>
        </Link>

        {/* Quick gift lookup */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative max-w-xs w-full">
          <input
            type="number"
            min="1"
            placeholder="Search Gift #ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-full bg-gray-900/90 text-sm text-gray-200 pl-9 pr-4 py-1.5 rounded-lg border border-gray-800 focus:outline-none focus:border-blue-500 transition"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
        </form>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-gray-300 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800/50 hidden sm:block"
          >
            Create Gift
          </Link>
          <ConnectButton
            accountStatus="avatar"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
