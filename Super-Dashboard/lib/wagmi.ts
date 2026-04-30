import { http } from "viem";
import { celo } from "viem/chains";
import { cookieStorage, createConfig, createStorage } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

import { APP_NAME, CELO_MAINNET } from "@/lib/constants";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "vista-demo-walletconnect";

const RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC || CELO_MAINNET.rpcUrl;

export const celoNetwork = celo;

export const wagmiConfig = createConfig({
  chains: [celoNetwork],
  connectors: [
    injected(),
    walletConnect({ projectId: PROJECT_ID }),
    coinbaseWallet({ appName: APP_NAME }),
  ],
  transports: {
    [celoNetwork.id]: http(RPC_URL),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
});
