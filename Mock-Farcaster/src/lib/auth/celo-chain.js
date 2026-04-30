import { defineChain } from "viem";
import {
  CELO_CHAIN_ID as SDK_CELO_CHAIN_ID,
  CELO_RPC_URL as SDK_CELO_RPC_URL,
  CELO_EXPLORER_URL as SDK_CELO_EXPLORER_URL,
} from "vista-protocol";

function parseChainId(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : SDK_CELO_CHAIN_ID ?? 42220;
}

export const CELO_CHAIN_ID = parseChainId(
  process.env.NEXT_PUBLIC_CELO_CHAIN_ID,
);

export const celoChain = defineChain({
  id: CELO_CHAIN_ID,
  name: "Celo",
  nativeCurrency: {
    name: "Celo",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || SDK_CELO_RPC_URL || "https://forno.celo.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Celoscan",
      url: process.env.NEXT_PUBLIC_CELO_EXPLORER_URL || SDK_CELO_EXPLORER_URL || "https://celoscan.io",
    },
  },
  testnet: false,
});
