import { base, baseSepolia, hardhat } from "viem/chains";

export const STONKGIFT_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0x0000000000000000000000000000000000000000", // to be populated when mainnet deployed
  [baseSepolia.id]: "0xdB68972E9c11c479d26df5e7832626e25B782a01", // testnet placeholder or deployed
  [hardhat.id]: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // local node deployed address
};

export function getStonkGiftAddress(chainId?: number): `0x${string}` {
  if (!chainId) return STONKGIFT_ADDRESSES[baseSepolia.id];
  return STONKGIFT_ADDRESSES[chainId] || STONKGIFT_ADDRESSES[baseSepolia.id];
}
