import { createConfig } from "ponder";
import type { Abi } from "viem";
import VistaStreamAbiJson from "./abis/VistaStream.json";
import VistaEscrowAbiJson from "./abis/VistaEscrow.json";
import VistaVaultAbiJson from "./abis/VistaVault.json";
import VistaReceiptAbiJson from "./abis/VistaReceipt.json";

const VistaStreamAbi = VistaStreamAbiJson as Abi;
const VistaEscrowAbi = VistaEscrowAbiJson as Abi;
const VistaVaultAbi = VistaVaultAbiJson as Abi;
const VistaReceiptAbi = VistaReceiptAbiJson as Abi;

export default createConfig({
  database: {
    schema: process.env.DATABASE_SCHEMA ?? "public",
  },
  chains: {
    celo: {
      id: 42220,
      rpc: process.env.PONDER_RPC_URL_42220 || "https://forno.celo.org",
    },
  },
  contracts: {
    VistaStream: {
      chain: "celo",
      abi: VistaStreamAbi,
      address:
        (process.env.VISTA_STREAM_ADDRESS as `0x${string}`) ||
        "0x0000000000000000000000000000000000000000",
      startBlock: process.env.START_BLOCK ? Number(process.env.START_BLOCK) : 0,
    },
    VistaEscrow: {
      chain: "celo",
      abi: VistaEscrowAbi,
      address:
        (process.env.VISTA_ESCROW_ADDRESS as `0x${string}`) ||
        "0x0000000000000000000000000000000000000000",
      startBlock: process.env.START_BLOCK ? Number(process.env.START_BLOCK) : 0,
    },
    VistaVault: {
      chain: "celo",
      abi: VistaVaultAbi,
      address:
        (process.env.VISTA_VAULT_ADDRESS as `0x${string}`) ||
        "0x0000000000000000000000000000000000000000",
      startBlock: process.env.START_BLOCK ? Number(process.env.START_BLOCK) : 0,
    },
    VistaReceipt: {
      chain: "celo",
      abi: VistaReceiptAbi,
      address:
        (process.env.VISTA_RECEIPT_ADDRESS as `0x${string}`) ||
        "0x0000000000000000000000000000000000000000",
      startBlock: process.env.START_BLOCK ? Number(process.env.START_BLOCK) : 0,
    },
  },
});
