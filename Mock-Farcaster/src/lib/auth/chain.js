import { defineChain } from "viem";

export const CELO_CHAIN_ID = 42220;

export const celoChain = defineChain({
  id: CELO_CHAIN_ID,
  name: "Celo",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "CeloScan",
      url: process.env.NEXT_PUBLIC_CELO_EXPLORER_URL || "https://celoscan.io",
    },
  },
  testnet: false,
});
