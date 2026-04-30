interface VistaConfig {
    apiKey: string;
    userWallet: string;
    oracleUrl: string;
    campaignId: string;
    publisherWallet: string;
    requireFullscreen?: boolean;
}
interface AttentionSignals {
    visibility: number;
    tabFocused: boolean;
    mouseActive: boolean;
    scrolled: boolean;
}
interface HeartbeatPayload {
    sessionId: string;
    apiKey: string;
    userWallet: string;
    campaignId: string;
    publisherWallet: string;
    timestamp: number;
    nonce: string;
    score: number;
    signals: AttentionSignals;
}
interface HeartbeatResponse {
    valid: boolean;
    score: number;
    validSeconds: number;
    pendingSeconds: number;
    flagged: boolean;
    error?: string;
}
interface EarnCallbackData {
    sessionAmount: number;
    tickAmount: number;
    validSeconds: number;
    score: number;
    flagged: boolean;
}
interface VistaStatus {
    active: boolean;
    sessionId: string | null;
    validSeconds: number;
    sessionAmount: number;
    score: number;
}
interface OnboardingParams {
    wallet: string;
    dashboardUrl?: string;
}
interface EarningOverlayParams {
    campaignTitle?: string;
    targetElement?: HTMLElement | null;
}
interface WalletAuthMessageParams {
    domain: string;
    uri: string;
    address: string;
    nonce: string;
    chainId: number;
    issuedAt: string;
}
interface WalletSignInParams {
    address: string;
    chainId: number;
    targetChainId?: number;
    domain: string;
    uri: string;
    nonceEndpoint: string;
    verifyEndpoint: string;
    switchChain?: (chainId: number) => Promise<{
        id: number;
    }>;
    signMessage: (message: string) => Promise<string>;
}

declare class Vista {
    private config;
    private collector;
    private sender;
    private sessionManager;
    private earnCallback;
    private sessionAmount;
    private lastValidSeconds;
    private lastScore;
    private isActive;
    private beforeunloadHandler;
    private visibilitychangeHandler;
    private listenersSetup;
    private isFullscreenActive;
    private fullscreenchangeHandler;
    private trackedElementId;
    private startTime;
    private overlayIntervalId;
    private overlayFullscreenHandler;
    private overlayScrollHandler;
    init(config: VistaConfig): void;
    attachZone(elementId: string): void;
    detachZone(): void;
    onEarn(callback: (data: EarnCallbackData) => void): void;
    getStatus(): VistaStatus;
    showOnboardingModal(params: OnboardingParams): void;
    showEarningOverlay(params?: EarningOverlayParams): void;
    private removeEarningOverlay;
    private animateValue;
    private buildPayload;
    private handleResponse;
    private postSessionEnd;
    private setupFullscreenListener;
    private removeFullscreenListener;
    private checkIsFullscreen;
    private setupSessionEndListeners;
    private removeSessionEndListeners;
}
declare const vista: Vista;

declare const CELO_CHAIN_ID = 42220;
declare const CELO_RPC_URL = "https://forno.celo.org";
declare const CELO_EXPLORER_URL = "https://celoscan.io";
declare function buildWalletAuthMessage(params: WalletAuthMessageParams): string;
declare function performWalletSignIn(params: WalletSignInParams): Promise<void>;

export { type AttentionSignals, CELO_CHAIN_ID, CELO_EXPLORER_URL, CELO_RPC_URL, type EarnCallbackData, type EarningOverlayParams, type HeartbeatPayload, type HeartbeatResponse, type OnboardingParams, vista as Vista, type VistaConfig, type VistaStatus, type WalletAuthMessageParams, type WalletSignInParams, buildWalletAuthMessage, performWalletSignIn };
