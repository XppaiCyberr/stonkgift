export interface TokenizedStock {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  logo: string;
  color: string;
  address: `0x${string}`;
}

export const SUPPORTED_STOCKS: TokenizedStock[] = [
  {
    name: "Nvidia",
    symbol: "NVDAc",
    description: "Coinbase Tokenized NVIDIA",
    decimals: 18,
    logo: "🟩",
    color: "#76B900",
    address: "0xb20000000000000000000078ee7ce2fE4908108C",
  },
  {
    name: "Apple",
    symbol: "AAPLc",
    description: "Coinbase Tokenized Apple",
    decimals: 18,
    logo: "🍎",
    color: "#A2AAAD",
    address: "0xb200000000000000000000C2e324d24d7eEcd1fb",
  },
  {
    name: "Alphabet (Google)",
    symbol: "GOOGLc",
    description: "Coinbase Tokenized Google",
    decimals: 18,
    logo: "🔍",
    color: "#4285F4",
    address: "0xb2000000000000000000002D0BA3164cc74f58B7",
  },
  {
    name: "Meta",
    symbol: "METAc",
    description: "Coinbase Tokenized Meta",
    decimals: 18,
    logo: "♾️",
    color: "#0668E1",
    address: "0xb2000000000000000000008bC8786B856E61707C",
  },
];

export const DEFAULT_STOCK = SUPPORTED_STOCKS[0]; // NVDAc
