import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  http,
  parseUnits,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const MOCK_USDC_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, amount = 1000 } = body as {
      address: `0x${string}`;
      amount?: number;
    };

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid or missing wallet address." },
        { status: 400 },
      );
    }

    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY as
      | `0x${string}`
      | undefined;
    if (!adminPrivateKey) {
      return NextResponse.json(
        { error: "Faucet is not configured (missing ADMIN_PRIVATE_KEY)." },
        { status: 500 },
      );
    }

    const mockUsdcAddress = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS as
      | `0x${string}`
      | undefined;
    if (!mockUsdcAddress) {
      return NextResponse.json(
        {
          error:
            "Faucet is not configured (missing NEXT_PUBLIC_MOCK_USDC_ADDRESS).",
        },
        { status: 500 },
      );
    }

    const account = privateKeyToAccount(adminPrivateKey);

    const client = createWalletClient({
      account,
      chain: celo,
      transport: http(
        process.env.NEXT_PUBLIC_CELO_RPC || "https://forno.celo.org",
      ),
    }).extend(publicActions);

    const mintAmount = parseUnits(String(amount), 6); // USDC has 6 decimals

    const hash = await client.writeContract({
      address: mockUsdcAddress,
      abi: MOCK_USDC_ABI,
      functionName: "mint",
      args: [address, mintAmount],
    });

    await client.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, hash });
  } catch (error) {
    console.error("[faucet] Mint failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error during mint.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
