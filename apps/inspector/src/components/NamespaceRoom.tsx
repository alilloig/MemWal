/**
 * A namespace's library room: one crystal shard per memory, resting in the
 * shelf niches of the room's back wall. Click a shard to inspect it; the
 * room console shows the shard's text (once the room is decrypted), its
 * metadata, and its on-chain links.
 */
import { useMemo, useState } from "react";
import type { MemoryBlob, SuiNetwork } from "../types";
import { formatBytes, short, suiObjectUrl, walruscanBlobUrl } from "../lib/format";
import { Snippet } from "./Snippet";

/** Shelf-wall anchor bands shared by all library variants (in viewport %). */
const SHELF = { left: 30, right: 70, rows: [36, 48.5, 60.5] as const, perRow: 6 };
const MAX_ON_SHELF = SHELF.rows.length * SHELF.perRow;

export function ShelfShards({
    blobs,
    selectedId,
    onSelect,
}: {
    blobs: MemoryBlob[];
    selectedId: string | null;
    onSelect: (objectId: string) => void;
}) {
    const placed = blobs.slice(0, MAX_ON_SHELF);
    const step = (SHELF.right - SHELF.left) / (SHELF.perRow - 1);
    return (
        <>
            {placed.map((b, i) => {
                const row = Math.floor(i / SHELF.perRow);
                const col = i % SHELF.perRow;
                const revealed = b.text !== undefined;
                return (
                    <button
                        key={b.objectId}
                        className={`shelf-shard ${revealed ? "shelf-shard--lit" : ""} ${selectedId === b.objectId ? "shelf-shard--selected" : ""}`}
                        style={{ left: `${SHELF.left + col * step}%`, top: `${SHELF.rows[row]}%` }}
                        onClick={() => onSelect(b.objectId)}
                        title={revealed ? b.text : "sealed memory"}
                    >
                        <ShardGlyph lit={revealed} />
                    </button>
                );
            })}
        </>
    );
}

export function NamespaceConsole({
    namespace,
    blobs,
    network,
    selectedId,
    revealing,
    onReveal,
    onSelect,
}: {
    namespace: string;
    blobs: MemoryBlob[];
    network: SuiNetwork;
    selectedId: string | null;
    revealing: boolean;
    onReveal: () => void;
    onSelect: (objectId: string | null) => void;
}) {
    const selected = useMemo(
        () => blobs.find((b) => b.objectId === selectedId) ?? null,
        [blobs, selectedId],
    );
    const sealedCount = blobs.filter((b) => b.text === undefined).length;
    const overflow = blobs.length - Math.min(blobs.length, MAX_ON_SHELF);
    const [showSnippet, setShowSnippet] = useState(false);

    return (
        <section>
            <div className="section-head">
                <h2>{namespace}</h2>
                <div className="section-actions">
                    <button
                        className="primary"
                        disabled={revealing || sealedCount === 0}
                        onClick={onReveal}
                        title="recall() this namespace and join the decrypted text onto the shards by blob_id"
                    >
                        {revealing ? "Decrypting…" : sealedCount === 0 ? "All revealed" : `Decrypt room (${sealedCount})`}
                    </button>
                </div>
            </div>

            {selected ? (
                <ShardDetail blob={selected} network={network} onBack={() => onSelect(null)} />
            ) : (
                <>
                    <p className="hint">
                        {blobs.length} memor{blobs.length === 1 ? "y" : "ies"} rest in this room —
                        each shard on the shelf is a Walrus blob whose{" "}
                        <code>memwal_namespace</code> is <code>{namespace}</code>. Click a shard to
                        inspect it. Sealed shards need the room decrypted first.
                        {overflow > 0 && ` (${overflow} more beyond the shelf — decrypt to browse.)`}
                    </p>
                    <button className="hint" style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }} onClick={() => setShowSnippet((s) => !s)}>
                        {showSnippet ? "▾" : "▸"} Show the SDK call
                    </button>
                    {showSnippet && (
                        <Snippet
                            code={`// this room = the on-chain blobs whose metadata says
//   memwal_namespace == "${namespace}"
// decrypting it:
const res = await memwal.recall({
  query: "everything", limit: 100, namespace: "${namespace}",
})
// join res.results onto the shelf by blob_id`}
                        />
                    )}
                </>
            )}
        </section>
    );
}

function ShardDetail({
    blob: b,
    network,
    onBack,
}: {
    blob: MemoryBlob;
    network: SuiNetwork;
    onBack: () => void;
}) {
    const revealed = b.text !== undefined;
    return (
        <div className="shard-detail">
            <button className="shard-detail__back" onClick={onBack}>
                ← all shards
            </button>
            <p className={`shard-detail__text ${revealed ? "" : "shard-detail__text--sealed"}`}>
                {revealed ? b.text : "Sealed. Decrypt the room to read this shard."}
            </p>
            <div className="shard__meta">
                <span>{formatBytes(b.size)}</span>
                {b.registeredEpoch !== null && <span>registered e{b.registeredEpoch}</span>}
                {b.endEpoch !== null && <span>stored → e{b.endEpoch}</span>}
                {b.distance !== undefined && <span>d={b.distance.toFixed(3)}</span>}
            </div>
            <div className="shard__links">
                {b.agentId && <span className="shard__agent">agent {short(b.agentId, 8, 6)}</span>}
                <a href={walruscanBlobUrl(network, b.blobId)} target="_blank" rel="noreferrer">
                    blob {short(b.blobId, 6, 4)} ↗
                </a>
                <a href={suiObjectUrl(network, b.objectId)} target="_blank" rel="noreferrer">
                    object {short(b.objectId, 6, 4)} ↗
                </a>
            </div>
        </div>
    );
}

/** A faceted crystal; `lit` fills it from within. */
export function ShardGlyph({ lit }: { lit: boolean }) {
    return (
        <svg viewBox="0 0 24 34" width="26" height="37" fill="none">
            <defs>
                <linearGradient id="shard-lit-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#9BF3FF" />
                    <stop offset="1" stopColor="#67E8F9" stopOpacity="0.55" />
                </linearGradient>
            </defs>
            <path
                d="M12 1 L21 10 L17 30 L12 33 L7 30 L3 10 Z"
                fill={lit ? "url(#shard-lit-g)" : "rgba(167,139,250,0.16)"}
                stroke={lit ? "#B8F6FF" : "rgba(200,180,255,0.7)"}
                strokeWidth="1.2"
            />
            <path
                d="M12 1 L12 33 M3 10 L12 14 L21 10"
                stroke={lit ? "rgba(255,255,255,0.65)" : "rgba(200,180,255,0.35)"}
                strokeWidth="0.7"
            />
        </svg>
    );
}
