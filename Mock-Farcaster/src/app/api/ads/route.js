export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userWallet = searchParams.get("userWallet");

  if (!userWallet) {
    return Response.json({ campaigns: [] });
  }

  const dashboardUrl =
    process.env.NEXT_PUBLIC_VISTA_DASHBOARD_URL ?? "http://localhost:3031";

  try {
    const res = await fetch(
      `${dashboardUrl}/api/campaigns/active?userWallet=${encodeURIComponent(userWallet)}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      return Response.json({ campaigns: [] });
    }

    const data = await res.json();
    const campaigns = data.campaigns ?? [];
    const expectedChain = process.env.NEXT_PUBLIC_VISTA_CHAIN ?? "celo";
    const filteredCampaigns = campaigns.filter((c) => c.chain === expectedChain);
    
    return Response.json({ campaigns: filteredCampaigns });
  } catch {
    return Response.json({ campaigns: [] });
  }
}
