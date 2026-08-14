import type { InspectorSettings, SuiNetwork } from "./types";

/**
 * Walrus package IDs per network — the Blob object type the inspector lists
 * is `${walrusPackageId}::blob::Blob`. Same defaults the relayer sidecar uses
 * (services/server/scripts/sidecar/config.ts).
 */
export const WALRUS_PACKAGE_IDS: Record<SuiNetwork, string> = {
    testnet: "0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66",
    mainnet: "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77",
};

export const SUI_GRPC_URLS: Record<SuiNetwork, string> = {
    testnet: "https://fullnode.testnet.sui.io",
    mainnet: "https://fullnode.mainnet.sui.io",
};

export const DEFAULT_SETTINGS: InspectorSettings = {
    delegateKey: "",
    accountId: "",
    // In dev the SDK talks to the page's own origin and the vite proxy
    // forwards to the relayer (deployed relayers CORS-block localhost).
    // Production builds talk to the relayer directly.
    serverUrl:
        (import.meta.env.VITE_MEMWAL_SERVER_URL as string) ||
        (import.meta.env.DEV
            ? window.location.origin
            : "https://relayer.memory.walrus.xyz"),
    namespace: "default",
    network: ((import.meta.env.VITE_SUI_NETWORK as string) || "mainnet") as SuiNetwork,
    suiGrpcUrl: "",
    walrusPackageId: "",
    dashboardUrl:
        (import.meta.env.VITE_MEMWAL_DASHBOARD_URL as string) ||
        "https://memory.walrus.xyz",
};

/** Resolve per-network defaults for fields the user left blank. */
export function resolveSettings(s: InspectorSettings): InspectorSettings {
    return {
        ...s,
        suiGrpcUrl: s.suiGrpcUrl || SUI_GRPC_URLS[s.network],
        walrusPackageId: s.walrusPackageId || WALRUS_PACKAGE_IDS[s.network],
    };
}

const STORAGE_KEY = "memwal-inspector-settings";

export function loadSettings(): InspectorSettings | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as InspectorSettings;
        if (!parsed.delegateKey || !parsed.accountId) return null;
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return null;
    }
}

export function saveSettings(s: InspectorSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function clearSettings(): void {
    localStorage.removeItem(STORAGE_KEY);
}
