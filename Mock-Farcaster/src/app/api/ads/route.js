export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userWallet = searchParams.get("userWallet");
  const chainId = searchParams.get("chainId");

  if (!userWallet) {
    return Response.json({ campaigns: [] });
  }

  const dashboardUrl =
    process.env.NEXT_PUBLIC_VISTA_DASHBOARD_URL ?? "http://localhost:3031";

  try {
    const url = new URL(`${dashboardUrl}/api/campaigns/active`);
    url.searchParams.set("userWallet", userWallet);
    if (chainId) url.searchParams.set("chainId", chainId);

    const res = await fetch(url.toString(), { cache: "no-store" });

    if (!res.ok) {
      return Response.json({ campaigns: [] });
    }

    const data = await res.json();
    return Response.json({ campaigns: data.campaigns ?? [] });
  } catch {
    return Response.json({ campaigns: [] });
  }
}
