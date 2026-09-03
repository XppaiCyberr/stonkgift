"use client";

import React from "react";

interface StockIconProps {
  symbol: string;
  className?: string;
  size?: number;
}

export function StockIcon({ symbol, className = "w-6 h-6", size = 24 }: StockIconProps) {
  const s = symbol.toUpperCase().replace("C", ""); // e.g. "NVDAc" -> "NVDA"

  switch (s) {
    case "NVDA":
      return (
        <div
          className={`flex items-center justify-center rounded-lg bg-[#76B900]/15 text-[#76B900] ${className}`}
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4/5 h-4/5">
            <path d="M8.7 15.5c-.8 0-1.4-.6-1.4-1.4s.6-1.4 1.4-1.4 1.4.6 1.4 1.4-.6 1.4-1.4 1.4zm6.6-4.2c-1.3-1.3-3.1-2-5-2-1.9 0-3.7.7-5 2-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0 .9-.9 2.2-1.4 3.6-1.4 1.4 0 2.7.5 3.6 1.4.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4zm2.8-2.8c-2.1-2.1-4.9-3.2-7.8-3.2-3 0-5.7 1.1-7.8 3.2-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0 1.7-1.7 4-2.6 6.4-2.6 2.4 0 4.7.9 6.4 2.6.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4zM21 5.7C18.1 2.8 14.3 1.3 10.3 1.3S2.5 2.8-.4 5.7c-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0C3.5 4.5 6.8 3.3 10.3 3.3s6.8 1.2 9.3 3.7c.4.4 1 .4 1.4 0 .4-.3.4-1 0-1.3z" />
          </svg>
        </div>
      );

    case "AAPL":
      return (
        <div
          className={`flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 ${className}`}
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4/5 h-4/5">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.72-.93 2.74 1.01.08 2.03-.5 2.63-1.24" />
          </svg>
        </div>
      );

    case "GOOGL":
      return (
        <div
          className={`flex items-center justify-center rounded-lg bg-white text-zinc-900 ${className}`}
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" className="w-4/5 h-4/5">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.97 11.97 0 0 0 0 12c0 1.92.46 3.74 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        </div>
      );

    case "META":
      return (
        <div
          className={`flex items-center justify-center rounded-lg bg-[#0081FB]/15 text-[#0081FB] ${className}`}
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4/5 h-4/5">
            <path d="M16.96 4.34c-1.92 0-3.6 1.03-4.96 2.68C10.64 5.37 8.96 4.34 7.04 4.34 3.4 4.34.8 7.34.8 11.08c0 4.54 3.77 8.58 7.6 8.58 2.05 0 3.66-1.12 4.8-2.73 1.14 1.61 2.75 2.73 4.8 2.73 3.83 0 7.6-4.04 7.6-8.58 0-3.74-2.6-6.74-6.24-6.74zm-9.92 13.5c-2.77 0-5.44-3.12-5.44-6.76 0-2.65 1.77-4.8 4.4-4.8 1.63 0 3.1 1.04 4.23 2.92-1.8 3.51-2.45 6.74-3.19 8.64zm9.92 0c-.74-1.9-1.39-5.13-3.19-8.64 1.13-1.88 2.6-2.92 4.23-2.92 2.63 0 4.4 2.15 4.4 4.8 0 3.64-2.67 6.76-5.44 6.76z" />
          </svg>
        </div>
      );

    default:
      return (
        <div
          className={`flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs ${className}`}
          style={{ width: size, height: size }}
        >
          {symbol.slice(0, 3)}
        </div>
      );
  }
}
