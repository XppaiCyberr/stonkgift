"use client";

import React from "react";
import Image from "next/image";

interface StockIconProps {
  symbol: string;
  className?: string;
  size?: number;
}

const STOCK_IMAGE_MAP: Record<string, string> = {
  NVDA: "/nvda_200x200.webp",
  NVDAC: "/nvda_200x200.webp",
  AAPL: "/aapl_200x200.webp",
  AAPLC: "/aapl_200x200.webp",
  GOOG: "/goog_200x200.webp",
  GOOGL: "/goog_200x200.webp",
  GOOGLC: "/goog_200x200.webp",
  META: "/meta_200x200.webp",
  METAC: "/meta_200x200.webp",
};

export function StockIcon({ symbol, className = "", size = 28 }: StockIconProps) {
  const normalizedSymbol = symbol ? symbol.toUpperCase() : "";
  const imageSrc = STOCK_IMAGE_MAP[normalizedSymbol] || STOCK_IMAGE_MAP[normalizedSymbol.replace(/C$/, "")];

  if (imageSrc) {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 shadow-sm flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={imageSrc}
          alt={symbol}
          width={size}
          height={size}
          className="object-cover w-full h-full p-0.5"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs uppercase border border-zinc-700 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {symbol ? symbol.slice(0, 3) : "STK"}
    </div>
  );
}
