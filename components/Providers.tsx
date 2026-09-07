"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  getDefaultWallets,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { coinbaseWallet } from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider, http } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BUILDER_DATA_SUFFIX } from "@/lib/builder";

// Prioritize Coinbase Smart Wallet with passkey / Touch ID / Face ID
coinbaseWallet.preference = "smartWalletOnly";

const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
  appName: "StonkGift",
  projectId: "609c3f719017e2f84355ce230448a9f5",
  wallets: [
    {
      groupName: "Recommended (Gasless & Passkey)",
      wallets: [coinbaseWallet],
    },
    ...wallets,
  ],
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  dataSuffix: BUILDER_DATA_SUFFIX,
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#0052FF", // Base blue
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
