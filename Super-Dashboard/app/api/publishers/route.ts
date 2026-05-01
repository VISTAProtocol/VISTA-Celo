import { type NextRequest } from "next/server";
import { getPublishersByWallet } from "@/lib/data";
import { jsonError, jsonOk, ApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      throw new ApiError("Wallet address is required", 400);
    }

    const publishers = await getPublishersByWallet(wallet);
    return jsonOk(publishers);
  } catch (error) {
    console.error("[GET /api/publishers]", error);
    return jsonError(error);
  }
}
