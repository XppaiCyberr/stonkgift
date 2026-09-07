export interface TokenizedStock {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  logo: string;
  color: string;
  address: `0x${string}`;
  buyUrl: string;
}

export const SUPPORTED_STOCKS: TokenizedStock[] = [
  {
    name: "Nvidia",
    symbol: "NVDAc",
    description: "Coinbase Tokenized NVIDIA",
    decimals: 8,
    logo: "/nvda_200x200.webp",
    color: "#76B900",
    address: "0xb20000000000000000000078ee7ce2fE4908108C",
    buyUrl: "https://aerodrome.finance/swap?from=eth&to=0xb20000000000000000000078ee7ce2fe4908108c&chain0=8453&chain1=8453",
  },
  {
    name: "Apple",
    symbol: "AAPLc",
    description: "Coinbase Tokenized Apple",
    decimals: 8,
    logo: "/aapl_200x200.webp",
    color: "#A2AAAD",
    address: "0xb200000000000000000000C2e324d24d7eEcd1fb",
    buyUrl: "https://aerodrome.finance/swap?from=eth&to=0xb200000000000000000000c2e324d24d7eecd1fb&chain0=8453&chain1=8453",
  },
  {
    name: "Alphabet (Google)",
    symbol: "GOOGLc",
    description: "Coinbase Tokenized Google",
    decimals: 8,
    logo: "/goog_200x200.webp",
    color: "#4285F4",
    address: "0xb2000000000000000000002D0BA3164cc74f58B7",
    buyUrl: "https://aerodrome.finance/swap?from=eth&to=0xb2000000000000000000002d0ba3164cc74f58b7&chain0=8453&chain1=8453",
  },
  {
    name: "Meta",
    symbol: "METAc",
    description: "Coinbase Tokenized Meta",
    decimals: 8,
    logo: "/meta_200x200.webp",
    color: "#0668E1",
    address: "0xb2000000000000000000008bC8786B856E61707C",
    buyUrl: "https://aerodrome.finance/swap?from=eth&to=0xb2000000000000000000008bc8786b856e61707c&chain0=8453&chain1=8453",
  },
];

export const DEFAULT_STOCK = SUPPORTED_STOCKS[0]; // NVDAc

export function getBuyStockUrl(addressOrSymbol: string): string {
  const stock = SUPPORTED_STOCKS.find(
    (s) =>
      s.address.toLowerCase() === addressOrSymbol.toLowerCase() ||
      s.symbol.toLowerCase() === addressOrSymbol.toLowerCase()
  );
  if (stock?.buyUrl) return stock.buyUrl;
  return `https://aerodrome.finance/swap?from=eth&to=${addressOrSymbol}&chain0=8453&chain1=8453`;
}
