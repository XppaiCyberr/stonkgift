import { base, baseSepolia } from "viem/chains";

export const STONKGIFT_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0x0000000000000000000000000000000000000000", // Base Mainnet
  [baseSepolia.id]: "0xdB68972E9c11c479d26df5e7832626e25B782a01", // Base Sepolia Testnet
};

export function getStonkGiftAddress(chainId?: number): `0x${string}` {
  if (!chainId) return STONKGIFT_ADDRESSES[baseSepolia.id];
  return STONKGIFT_ADDRESSES[chainId] || STONKGIFT_ADDRESSES[baseSepolia.id];
}
