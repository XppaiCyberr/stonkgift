export interface TokenizedStock {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  logo: string;
  color: string;
  addresses: {
    base: `0x${string}`;
    baseSepolia: `0x${string}`;
  };
}

export const SUPPORTED_STOCKS: TokenizedStock[] = [
  {
    name: "NVIDIA Corp",
    symbol: "NVDA",
    description: "AI Hardware & GPU Giant",
    decimals: 18,
    logo: "🟩",
    color: "#76B900",
    addresses: {
      base: "0x0000000000000000000000000000000000000000",
      baseSepolia: "0x1111111111111111111111111111111111111111",
    },
  },
  {
    name: "Apple Inc",
    symbol: "AAPL",
    description: "Consumer Tech Ecosystem",
    decimals: 18,
    logo: "🍎",
    color: "#A2AAAD",
    addresses: {
      base: "0x0000000000000000000000000000000000000000",
      baseSepolia: "0x2222222222222222222222222222222222222222",
    },
  },
  {
    name: "Tesla Inc",
    symbol: "TSLA",
    description: "EVs & Clean Energy",
    decimals: 18,
    logo: "⚡",
    color: "#E82127",
    addresses: {
      base: "0x0000000000000000000000000000000000000000",
      baseSepolia: "0x3333333333333333333333333333333333333333",
    },
  },
];

export const DEFAULT_STOCK = SUPPORTED_STOCKS[0]; // NVDA per build plan
