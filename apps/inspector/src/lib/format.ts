import type { SuiNetwork } from "../types";

export function short(id: string, head = 8, tail = 6): string {
    if (!id || id.length <= head + tail + 1) return id;
    return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export function formatBytes(n: number | null | undefined): string {
    if (n === null || n === undefined) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDate(ms: number | null | undefined): string {
    if (!ms) return "—";
    return new Date(ms).toLocaleString();
}

export function suiObjectUrl(network: SuiNetwork, objectId: string): string {
    const host = network === "testnet" ? "testnet.suivision.xyz" : "suivision.xyz";
    return `https://${host}/object/${objectId}`;
}

export function walruscanBlobUrl(network: SuiNetwork, blobId: string): string {
    return `https://walruscan.com/${network}/blob/${encodeURIComponent(blobId)}`;
}
