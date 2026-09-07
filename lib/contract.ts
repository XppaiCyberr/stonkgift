import { base } from "viem/chains";

export const STONKGIFT_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0x5522248Ab918315DDE146dBE9b8346E04F305803", // Base Mainnet deployed contract address
};

export function getStonkGiftAddress(chainId?: number): `0x${string}` {
  if (!chainId) return STONKGIFT_ADDRESSES[base.id];
  return STONKGIFT_ADDRESSES[chainId] || STONKGIFT_ADDRESSES[base.id];
}
