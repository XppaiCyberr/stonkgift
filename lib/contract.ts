import { base } from "viem/chains";

export const STONKGIFT_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0xb804AAaA4702C9Fd31D1Adc04925d45B69537736", // Base Mainnet deployed contract address
};

export function getStonkGiftAddress(chainId?: number): `0x${string}` {
  if (!chainId) return STONKGIFT_ADDRESSES[base.id];
  return STONKGIFT_ADDRESSES[chainId] || STONKGIFT_ADDRESSES[base.id];
}
