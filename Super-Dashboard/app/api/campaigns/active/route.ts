import { z } from "zod"

import { jsonError, jsonOk } from "@/lib/api"
import { getActiveCampaignsForUser } from "@/lib/data"

const querySchema = z.object({
  userWallet: z.string().min(6),
  chainId: z.coerce.number().int().positive().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.parse({
      userWallet: searchParams.get("userWallet"),
      chainId: searchParams.get("chainId") ?? undefined,
    })

    return jsonOk(await getActiveCampaignsForUser(parsed.userWallet, parsed.chainId))
  } catch (error) {
    return jsonError(error)
  }
}
