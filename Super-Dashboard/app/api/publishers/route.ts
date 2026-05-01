import { type NextRequest } from "next/server";
import { getPublishersByWallet } from "@/lib/data";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return jsonError("Wallet address is required", 400);
    }

    const publishers = await getPublishersByWallet(wallet);
    return jsonOk(publishers);
  } catch (error) {
    console.error("[GET /api/publishers]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
