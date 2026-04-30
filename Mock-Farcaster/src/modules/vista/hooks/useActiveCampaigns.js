"use client";
import { useState, useEffect } from "react";

export function useActiveCampaigns(userWallet, chainId) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userWallet) {
      setLoading(false);
      return;
    }

    const fetchCampaigns = async () => {
      try {
        const params = new URLSearchParams({ userWallet });
        if (chainId) params.set("chainId", String(chainId));

        const res = await fetch(`/api/campaigns?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch campaigns");
        setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error("[VISTA] Failed to fetch campaigns:", err);
        setError(err.message);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [userWallet, chainId]);

  return { campaigns, loading, error };
}
