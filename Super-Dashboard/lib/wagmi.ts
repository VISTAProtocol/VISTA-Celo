import { defineChain, http } from "viem"
import { cookieStorage, createConfig, createStorage } from "wagmi"
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors"

import { APP_NAME, CELO_SEPOLIA } from "@/lib/constants"

const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "vista-demo-walletconnect"

const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC || CELO_SEPOLIA.rpcUrl

export const celoSepolia = defineChain({
  id: CELO_SEPOLIA.id,
  name: CELO_SEPOLIA.name,
  network: "celo-sepolia",
  nativeCurrency: {
    name: "Celo",
    symbol: CELO_SEPOLIA.currencySymbol,
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Celo Sepolia Explorer",
      url: CELO_SEPOLIA.explorerUrl,
    },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [celoSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: PROJECT_ID }),
    coinbaseWallet({ appName: APP_NAME }),
  ],
  transports: {
    [celoSepolia.id]: http(RPC_URL),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
})
