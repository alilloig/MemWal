/**
 * On-chain enumeration layer.
 *
 * The SDK/relayer intentionally has no "list all memories" API: the relayer
 * only stores vectors + blob IDs, and the chain is the source of truth for
 * what exists. Every memory is a Walrus `Blob` object owned by the account
 * owner, tagged with `memwal_*` metadata attributes (namespace, agent,
 * package). This module reads that inventory directly from a Sui fullnode —
 * the same discovery path the relayer itself uses for `restore()`.
 */

import { SuiGrpcClient } from "@mysten/sui/grpc";
import { bcs } from "@mysten/sui/bcs";
import type { AccountInfo, MemoryBlob, SuiNetwork } from "../types";

export function createSuiClient(network: SuiNetwork, baseUrl: string): SuiGrpcClient {
    return new SuiGrpcClient({ network, baseUrl });
}

// Walrus's `Metadata` struct is `{ metadata: VecMap<String, String> }`;
// VecMap's BCS layout matches bcs.map's vector-of-pairs, so this parses the
// dynamic-field value bytes returned by gRPC getDynamicField.
const WALRUS_METADATA_BCS = bcs.struct("Metadata", {
    metadata: bcs.map(bcs.string(), bcs.string()),
});

// Dynamic field name b"metadata" as gRPC wants it: BCS bytes, not JSON.
const METADATA_FIELD_NAME = {
    type: "vector<u8>",
    bcs: bcs
        .vector(bcs.u8())
        .serialize(Array.from(new TextEncoder().encode("metadata")))
        .toBytes(),
};

/**
 * blob_id on chain is a u256; Walrus aggregators and explorers use the
 * base64url little-endian form. Convert between the two.
 */
export function blobIdToBase64Url(raw: string | number | null | undefined): string | null {
    if (raw === null || raw === undefined || raw === "") return null;
    const s = String(raw);
    if (!/^\d+$/.test(s) || s.length <= 20) return s;
    try {
        const hex = BigInt(s).toString(16).padStart(64, "0");
        const bytes = hex
            .match(/.{2}/g)!
            .map((b) => parseInt(b, 16))
            .reverse();
        let bin = "";
        for (const b of bytes) bin += String.fromCharCode(b);
        return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch {
        return s;
    }
}

function toNum(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/**
 * Read the Walrus blob id from a Blob object's JSON. gRPC has been observed to
 * return it under both `blob_id` and `blobId` — the sidecar reference reads
 * both (services/server/scripts/sidecar/routes/walrus-query.ts), so mirror it
 * rather than storing "" (which breaks the Walruscan link and the reveal join).
 */
function readBlobId(json: Record<string, any>): string {
    const raw = json.blob_id ?? json.blobId;
    return blobIdToBase64Url(raw) ?? String(raw ?? "");
}

/** Read the MemWalAccount object — its `owner` address is who owns the blobs. */
export async function fetchAccount(
    client: SuiGrpcClient,
    accountId: string,
): Promise<AccountInfo> {
    const res = await (client as any).getObject({
        objectId: accountId,
        include: { json: true },
    });
    const json = res?.object?.json as Record<string, unknown> | undefined;
    if (!json) throw new Error(`MemWalAccount object not found: ${accountId}`);
    return {
        owner: String(json.owner ?? ""),
        createdAt: toNum(json.created_at),
        active: Boolean(json.active),
        delegateKeyCount: Array.isArray(json.delegate_keys) ? json.delegate_keys.length : 0,
    };
}

async function mapConcurrent<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

/** Fetch the memwal_* attribute map attached to one Blob object. */
async function fetchBlobAttributes(
    client: SuiGrpcClient,
    objectId: string,
): Promise<Map<string, string>> {
    try {
        const res = await (client as any).getDynamicField({
            parentId: objectId,
            name: METADATA_FIELD_NAME,
        });
        const bytes = res?.dynamicField?.value?.bcs;
        if (!bytes) return new Map();
        return WALRUS_METADATA_BCS.parse(bytes).metadata as Map<string, string>;
    } catch (err) {
        // Usually "no metadata dynamic field": a Walrus blob that isn't a
        // memory, or one written before metadata tagging — callers filter
        // these out. A transient gRPC/parse error lands here too, though, and
        // would silently drop a real memory, so leave a breadcrumb for that.
        console.warn(`memwal: could not read metadata for ${objectId}`, err);
        return new Map();
    }
}

/**
 * List every Walrus Blob object owned by `owner` and hydrate each with its
 * memwal_* metadata. Blobs without a `memwal_namespace` attribute are not
 * memories and are dropped.
 */
export async function fetchMemoryBlobs(
    client: SuiGrpcClient,
    owner: string,
    walrusPackageId: string,
    onProgress?: (message: string) => void,
): Promise<MemoryBlob[]> {
    const blobType = `${walrusPackageId}::blob::Blob`;
    const raw: Array<{ objectId: string; json: Record<string, any> }> = [];
    let cursor: string | undefined;

    // Guard against a server that never advances the cursor: cap the pages so a
    // repeated cursor can't spin forever with the UI stuck on "Reading chain…".
    const MAX_PAGES = 200;
    let truncated = true;
    for (let page = 0; page < MAX_PAGES; page++) {
        const res = await (client as any).listOwnedObjects({
            owner,
            type: blobType,
            include: { json: true },
            cursor,
            limit: 50,
        });
        for (const obj of res?.objects ?? []) {
            if (typeof obj?.objectId === "string") {
                raw.push({ objectId: obj.objectId, json: obj.json ?? {} });
            }
        }
        if (!res?.hasNextPage || !res?.cursor || res.cursor === cursor) {
            truncated = false;
            break;
        }
        cursor = res.cursor;
        onProgress?.(`Found ${raw.length} blob objects so far…`);
    }
    if (truncated) {
        console.warn(
            `memwal: stopped enumerating after ${MAX_PAGES} pages (~${raw.length} blobs); inventory may be incomplete.`,
        );
    }

    onProgress?.(`Reading metadata for ${raw.length} blob objects…`);

    const blobs = await mapConcurrent(raw, 5, async ({ objectId, json }) => {
        const attrs = await fetchBlobAttributes(client, objectId);
        const namespace = attrs.get("memwal_namespace");
        if (!namespace) return null;
        return {
            objectId,
            blobId: readBlobId(json),
            namespace,
            agentId: attrs.get("memwal_agent_id") ?? "",
            packageId: attrs.get("memwal_package_id") ?? "",
            size: toNum(json.size),
            registeredEpoch: toNum(json.registered_epoch),
            certifiedEpoch: toNum(json.certified_epoch),
            endEpoch: toNum(json.storage?.end_epoch),
            deletable: typeof json.deletable === "boolean" ? json.deletable : null,
        } satisfies MemoryBlob;
    });

    return blobs.filter((b): b is MemoryBlob => b !== null);
}
