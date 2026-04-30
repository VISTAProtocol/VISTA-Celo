import { createPublicClient, createWalletClient, http } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

if (!process.env.ORACLE_PRIVATE_KEY) {
  throw new Error("Missing required env var: ORACLE_PRIVATE_KEY");
}

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_CELO_RPC_URL ||
  "https://forno.celo.org";

export const account = privateKeyToAccount(
  process.env.ORACLE_PRIVATE_KEY as `0x${string}`,
);

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(RPC_URL),
});

export const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http(RPC_URL),
});

export const VISTA_STREAM_ABI = [
  {
    type: "function",
    name: "startStream",
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "campaignId", type: "bytes32" },
      { name: "userWallet", type: "address" },
      { name: "publisherWallet", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tickStream",
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "secondsElapsed", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "endStream",
    inputs: [{ name: "sessionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "StreamTick",
    inputs: [
      { name: "sessionId", type: "bytes32", indexed: true },
      { name: "userWallet", type: "address", indexed: false },
      { name: "publisherWallet", type: "address", indexed: false },
      { name: "totalAmount", type: "uint256", indexed: false },
      { name: "userAmount", type: "uint256", indexed: false },
      { name: "publisherAmount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

let deployments: { VistaStream: string; VistaEscrow: string };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  deployments = require("../deployments.json");
} catch {
  throw new Error(
    "deployments.json not found. Copy it from vista-contracts/ after deploying:\n" +
      "  cp ../vista-contracts/deployments.json ./deployments.json",
  );
}

export const VISTA_STREAM_ADDRESS = deployments.VistaStream as `0x${string}`;
