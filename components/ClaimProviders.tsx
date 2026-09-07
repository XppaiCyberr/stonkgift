"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Dedicated provider config for the /claim page.
 * Uses ONLY Coinbase Smart Wallet (passkey-based) — no RainbowKit,
 * no MetaMask, no wallet selection modal.
 * This gives non-crypto users the cleanest possible onboarding.
 */
const claimConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: "StonkGift",
      preference: "smartWalletOnly",
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

export function ClaimProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <WagmiProvider config={claimConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
