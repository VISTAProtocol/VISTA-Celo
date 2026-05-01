"use client";

import {
  Activity,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronLeft,
  Coins,
  Copy,
  Eye,
  MonitorPlay,
  TimerReset,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { LoadingScreen } from "@/components/loading-screen";
import { MetricChartCard } from "@/components/metric-chart-card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  contractAddresses,
  vistaStreamAbi,
  vistaVaultAbi,
} from "@/lib/contracts";
import type { OnChainEarningRecord } from "@/lib/on-chain-helpers";
import {
  buildRecentSessions,
  computePublisherStats,
  computeRevenuePerDay,
  computeSessionStats,
  extractUniqueSessionIds,
} from "@/lib/on-chain-helpers";
import type { PublisherAnalyticsData, PublisherRecord } from "@/lib/types";
import { formatUsdc, truncateAddress, truncateHash } from "@/lib/utils";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-lg bg-muted p-4 font-mono text-sm">
      <pre className="overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function PublisherDashboardPage() {
  const { address } = useAccount();

  // ─── Custom Tabs State ─────────────────────────────────────────
  const [activeMainTab, setActiveMainTab] = useState<"dashboard" | "analytics">("dashboard");
  
  // ─── Dashboard Tab State ───────────────────────────────────────
  const [platforms, setPlatforms] = useState<PublisherRecord[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<PublisherRecord | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"guide" | "apikey">("guide");

  // ─── Analytics Tab State ───────────────────────────────────────
  const [analyticsData, setAnalyticsData] = useState<PublisherAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ─── Wagmi & On-chain State ────────────────────────────────────
  const {
    writeContract,
    data: withdrawTxHash,
    isPending: isWithdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isWithdrawn } =
    useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const withdrawalAmountRef = useRef(0);

  const fetchTotalWithdrawn = useCallback(async () => {
    if (!address) return;
    const res = await fetch(`/api/publisher/withdrawal?wallet=${address}`);
    if (res.ok) {
      const data = (await res.json()) as { totalWithdrawn: number };
      setTotalWithdrawn(data.totalWithdrawn ?? 0);
    }
  }, [address]);

  useEffect(() => {
    void fetchTotalWithdrawn();
  }, [fetchTotalWithdrawn]);

  // Fetch platforms on mount
  useEffect(() => {
    async function fetchPlatforms() {
      if (!address) return;
      try {
        const res = await fetch(`/api/publishers?wallet=${address}`);
        if (res.ok) {
          const data = await res.json();
          setPlatforms(data);
        }
      } catch (err) {
        console.error("Failed to fetch platforms", err);
      } finally {
        setPlatformsLoading(false);
      }
    }
    void fetchPlatforms();
  }, [address]);

  // Fetch analytics data when analytics tab is active
  useEffect(() => {
    async function fetchAnalytics() {
      if (!address || analyticsData || activeMainTab !== "analytics") return;
      setAnalyticsLoading(true);
      try {
        const res = await fetch(`/api/publishers/${address}/analytics`);
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        }
      } catch (err) {
        console.error("Failed to fetch deep analytics", err);
      } finally {
        setAnalyticsLoading(false);
      }
    }
    void fetchAnalytics();
  }, [address, activeMainTab, analyticsData]);

  // ─── On-chain reads ────────────────────────────────────────────

  const { data: onChainBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddresses.vistaVault ?? undefined,
    abi: vistaVaultAbi,
    functionName: "getBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && contractAddresses.vistaVault) },
  });

  const { data: earningRecords, isLoading: isLoadingRecords } = useReadContract(
    {
      address: contractAddresses.vistaVault ?? undefined,
      abi: vistaVaultAbi,
      functionName: "getEarningRecords",
      args: address ? [address] : undefined,
      query: { enabled: Boolean(address && contractAddresses.vistaVault) },
    },
  );

  const sessionIds = useMemo(
    () =>
      extractUniqueSessionIds(
        earningRecords as readonly OnChainEarningRecord[] | undefined,
      ),
    [earningRecords],
  );

  const sessionContracts = useMemo(
    () =>
      sessionIds.map((id) => ({
        address: contractAddresses.vistaStream!,
        abi: vistaStreamAbi,
        functionName: "sessions" as const,
        args: [id] as const,
      })),
    [sessionIds],
  );

  const { data: sessionResults, isLoading: isLoadingSessions } =
    useReadContracts({
      contracts: sessionContracts,
      query: {
        enabled:
          sessionIds.length > 0 && Boolean(contractAddresses.vistaStream),
      },
    });

  // ─── Computed values ───────────────────────────────────────────

  const typedEarningRecords = earningRecords as
    | readonly OnChainEarningRecord[]
    | undefined;

  const onChainStats = useMemo(
    () => computePublisherStats(typedEarningRecords),
    [typedEarningRecords],
  );
  const onChainRevenuePerDay = useMemo(
    () => computeRevenuePerDay(typedEarningRecords),
    [typedEarningRecords],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSessionResults = sessionResults as any;

  const sessionStats = useMemo(
    () => computeSessionStats(typedSessionResults),
    [typedSessionResults],
  );
  const recentSessions = useMemo(
    () => buildRecentSessions(typedSessionResults, typedEarningRecords),
    [typedSessionResults, typedEarningRecords],
  );

  // ─── Withdraw ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isWithdrawn) return;
    void refetchBalance();
    if (address && withdrawalAmountRef.current > 0) {
      void fetch("/api/publisher/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          amount: withdrawalAmountRef.current,
          withdrawnAt: new Date().toISOString(),
        }),
      }).then(() => void fetchTotalWithdrawn());
      withdrawalAmountRef.current = 0;
    }
  }, [isWithdrawn, refetchBalance, address, fetchTotalWithdrawn]);

  function handleWithdraw() {
    if (!contractAddresses.vistaVault) return;
    withdrawalAmountRef.current = Number(onChainBalance ?? 0) / 1_000_000;
    resetWithdraw();
    writeContract({
      address: contractAddresses.vistaVault,
      abi: vistaVaultAbi,
      functionName: "withdraw",
    });
  }

  // ─── Render Helpers ────────────────────────────────────────────

  const [copiedKey, setCopiedKey] = useState(false);
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const renderDashboardTab = () => {
    if (platformsLoading) {
      return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (selectedPlatform) {
      return (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedPlatform(null)}
            className="mb-2 -ml-3 px-3 text-muted-foreground"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            All Platforms
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedPlatform.platform_name}</h2>
              <p className="text-sm text-muted-foreground">
                Registered on {new Date(selectedPlatform.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline" className="font-mono">
              {selectedPlatform.api_key.substring(0, 8)}...
            </Badge>
          </div>

          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveDetailTab("guide")}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeDetailTab === "guide"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                Integration Guide
              </button>
              <button
                onClick={() => setActiveDetailTab("apikey")}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeDetailTab === "apikey"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                API Key
              </button>
            </nav>
          </div>

          <div className="pt-4">
            {activeDetailTab === "guide" && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">01</span>
                    Install SDK
                  </h3>
                  <p className="text-sm text-muted-foreground">Install the core protocol package into your application.</p>
                  <CodeBlock code="npm install @vista-protocol/sdk" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">02</span>
                    Set environment variables
                  </h3>
                  <p className="text-sm text-muted-foreground">Provide your API key and publisher wallet address to authenticate.</p>
                  <CodeBlock code={`NEXT_PUBLIC_VISTA_API_KEY=${selectedPlatform.api_key}\nNEXT_PUBLIC_PUBLISHER_WALLET=${address}`} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">03</span>
                    Initialize SDK
                  </h3>
                  <p className="text-sm text-muted-foreground">Instantiate the SDK in your app layout or root component.</p>
                  <CodeBlock code={`import { VistaSDK } from '@vista-protocol/sdk';\n\nconst sdk = new VistaSDK({\n  publisherWallet: process.env.NEXT_PUBLIC_PUBLISHER_WALLET,\n  oracleUrl: 'https://oracle.vista.network'\n});`} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">04</span>
                    Attach Zones
                  </h3>
                  <p className="text-sm text-muted-foreground">Attach ad zones when they enter the viewport to start streaming.</p>
                  <CodeBlock code={`// When ad enters viewport\nsdk.attachZone(adElement, campaignId);\n\n// When ad exits viewport\nsdk.detachZone(adElement);`} />
                </div>
              </div>
            )}
            
            {activeDetailTab === "apikey" && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Your API Key</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-4 py-3 font-mono text-sm break-all">
                      {selectedPlatform.api_key}
                    </code>
                    <Button onClick={() => handleCopyKey(selectedPlatform.api_key)} variant="outline" className="shrink-0 h-[46px]">
                      {copiedKey ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copiedKey ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Security Best Practices</h3>
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Never commit keys to version control</p>
                        <p className="text-sm text-muted-foreground mt-1">Use environment variables (.env files) and add them to your .gitignore.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Rotate keys periodically</p>
                        <p className="text-sm text-muted-foreground mt-1">If you suspect your key is compromised, generate a new platform and update your environment variables.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Restrict domains</p>
                        <p className="text-sm text-muted-foreground mt-1">Ensure your API requests only originate from authorized platform domains.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Keep wallet secure</p>
                        <p className="text-sm text-muted-foreground mt-1">Your registered wallet receives all funds. Protect its private key diligently.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (platforms.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MonitorPlay className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No platforms registered</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Register your first platform to generate an API key and start tracking ad attention.
          </p>
          <Link href="/publisher/onboarding" className={buttonVariants({ className: "mt-6" })}>
            Register Platform
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Your Platforms</h2>
          <Link href="/publisher/onboarding" className={buttonVariants({ variant: "outline" })}>
            Register new platform
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              onClick={() => setSelectedPlatform(platform)}
              className="group cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MonitorPlay className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold line-clamp-1">{platform.platform_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(platform.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">API Key</p>
                  <p className="font-mono text-sm truncate">{platform.api_key.substring(0, 16)}...</p>
                </div>
                <div className="flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  View details &rarr;
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    const vaultBalanceRaw = Number(onChainBalance ?? 0);
    const hasVaultBalance = vaultBalanceRaw > 0;
    const isWithdrawing = isWithdrawPending || isConfirming;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Coins}
            title="Total USDC Withdrawn"
            value={formatUsdc(totalWithdrawn)}
            format="usdc"
          />
          <StatCard
            icon={Eye}
            title="Total ad impressions"
            value={onChainStats.totalAdImpressions}
          />
          <StatCard
            icon={TimerReset}
            title="Total viewer-seconds"
            value={sessionStats.totalViewerSeconds}
          />
          <StatCard
            icon={Activity}
            title="Active sessions now"
            value={sessionStats.activeSessions}
          />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    Vault balance
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {formatUsdc(vaultBalanceRaw / 1_000_000)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      USDC
                    </span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Accumulated revenue share from ad sessions — withdraw any time.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Button
                  onClick={handleWithdraw}
                  disabled={
                    !hasVaultBalance ||
                    isWithdrawing ||
                    !contractAddresses.vistaVault
                  }
                  size="lg"
                >
                  {isWithdrawing ? (
                    <>
                      <ArrowDownToLine className="animate-pulse mr-2 h-4 w-4" />
                      {isConfirming ? "Confirming…" : "Withdrawing…"}
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Withdraw to wallet
                    </>
                  )}
                </Button>
                {isWithdrawn && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Withdrawal confirmed!
                  </p>
                )}
                {withdrawError && (
                  <p className="max-w-xs text-right text-xs text-destructive">
                    {withdrawError.message.split("\n")[0]}
                  </p>
                )}
                {!hasVaultBalance && !isWithdrawn && (
                  <p className="text-xs text-muted-foreground">
                    No balance to withdraw
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <MetricChartCard
          data={onChainRevenuePerDay}
          description="Daily publisher revenue from on-chain VistaVault earning records."
          title="Revenue per day"
          valueFormatter={(value) => `${formatUsdc(value)} USDC`}
        />

        {/* Deep Analytics Section */}
        {analyticsLoading || !analyticsData ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
            <Skeleton className="h-96 w-full rounded-[28px]" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                icon={MonitorPlay}
                title="Campaigns tracked"
                value={analyticsData.breakdownByCampaign.length}
              />
              <StatCard
                icon={TimerReset}
                title="Avg session duration"
                value={`${analyticsData.averageSessionDuration.toFixed(1)}s`}
              />
              <StatCard
                icon={Activity}
                title="Top time slots"
                value={analyticsData.topTimeSlots[0]?.label ?? "N/A"}
              />
            </div>
            <MetricChartCard
              data={analyticsData.topTimeSlots.map((slot) => ({
                date: slot.hour.toString(),
                label: slot.label,
                value: slot.revenue,
              }))}
              title="Top performing time slots"
              description="Most active viewing hours based on historical data."
              kind="bar"
            />
            <div className="rounded-[28px] border border-border/70 bg-card/90 p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight">Revenue by campaign</h2>
                <p className="text-sm text-muted-foreground">Breakdown of earnings per tracked campaign.</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Viewer-seconds</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.breakdownByCampaign.map((item) => (
                    <TableRow key={item.campaignIdOnchain}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{item.campaignTitle}</p>
                          <p className="text-xs text-muted-foreground font-mono">{truncateHash(item.campaignIdOnchain)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.impressions}</TableCell>
                      <TableCell>{item.viewerSeconds}s</TableCell>
                      <TableCell className="text-right">{formatUsdc(item.revenue)} USDC</TableCell>
                    </TableRow>
                  ))}
                  {analyticsData.breakdownByCampaign.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No campaign revenue data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="rounded-[28px] border border-border/70 bg-card/90 p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Recent sessions
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest sessions attributed to this publisher wallet.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>User wallet</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Earned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {truncateHash(session.sessionIdOnchain)}
                  </TableCell>
                  <TableCell>{truncateAddress(session.userWallet)}</TableCell>
                  <TableCell>{session.secondsVerified}s</TableCell>
                  <TableCell>
                    {formatUsdc(session.publisherAmount ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        session.status === "active" ? "default" : "outline"
                      }
                    >
                      {session.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const isLoading =
    isLoadingRecords || (sessionIds.length > 0 && isLoadingSessions);

  if (isLoading) {
    return (
      <LoadingScreen description="Loading publisher revenue, active sessions, and daily trend lines." />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Publisher dashboard"
        title="Monetization Hub"
        description="Manage your platforms, API keys, and track comprehensive attention analytics."
      />

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6" aria-label="Main Tabs">
          <button
            onClick={() => {
              setActiveMainTab("dashboard");
              setSelectedPlatform(null);
            }}
            className={`whitespace-nowrap border-b-2 py-4 px-2 text-base font-medium transition-colors ${
              activeMainTab === "dashboard"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setActiveMainTab("analytics");
              setSelectedPlatform(null);
            }}
            className={`whitespace-nowrap border-b-2 py-4 px-2 text-base font-medium transition-colors ${
              activeMainTab === "analytics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      <div className="pt-2">
        {activeMainTab === "dashboard" ? renderDashboardTab() : renderAnalyticsTab()}
      </div>
    </div>
  );
}
