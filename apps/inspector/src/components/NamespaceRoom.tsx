/**
 * A namespace's library room: one crystal shard per memory, resting in the
 * shelf niches of the room's back wall. Click a shard to inspect it; the
 * room console shows the shard's text (once the room is decrypted), its
 * metadata, and its on-chain links.
 */
import { useMemo, useState } from "react";
import type { MemoryBlob, SuiNetwork } from "../types";
import { formatBytes, short, suiObjectUrl, walruscanBlobUrl } from "../lib/format";
import { variantFor } from "../palace/scenes";
import { Snippet } from "./Snippet";

/**
 * Niche centres of the uniform library grid (viewport %), measured from the
 * shared room still: 7 arched niches across, 3 rows. Every variant room is a
 * recolor of the same base, so these anchors land in the niches everywhere.
 */
const NICHE_COLS = [12.8, 24.8, 38.1, 50, 62, 74.5, 85.7] as const;
const NICHE_ROWS = [29, 50.5, 69.5] as const;
const MAX_ON_SHELF = NICHE_COLS.length * NICHE_ROWS.length; // 21

// Tiny deterministic per-slot variation so identical crystals feel placed by
// hand — rotation/scale only, never position (that must hit the niche).
function jitter(i: number, spread: number) {
    return (((i * 2654435761) % 1000) / 1000 - 0.5) * 2 * spread;
}

export function ShelfShards({
    namespace,
    blobs,
    selectedId,
    onSelect,
}: {
    namespace: string;
    blobs: MemoryBlob[];
    selectedId: string | null;
    onSelect: (objectId: string) => void;
}) {
    const crystal = `/palace/shard_${variantFor(namespace).key}.webp`;
    const placed = blobs.slice(0, MAX_ON_SHELF);
    return (
        <>
            {placed.map((b, i) => {
                const row = Math.floor(i / NICHE_COLS.length);
                const col = i % NICHE_COLS.length;
                const revealed = b.text !== undefined;
                const x = NICHE_COLS[col];
                const y = NICHE_ROWS[row];
                const rot = jitter(i * 7, 5);
                const scale = 0.92 + Math.abs(jitter(i * 5, 0.12));
                return (
                    <button
                        key={b.objectId}
                        className={`shelf-shard ${revealed ? "shelf-shard--lit" : ""} ${selectedId === b.objectId ? "shelf-shard--selected" : ""}`}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        onClick={() => onSelect(b.objectId)}
                        title={revealed ? b.text : "sealed memory"}
                    >
                        <span
                            className="shelf-shard__crystal"
                            style={{
                                backgroundImage: `url(${crystal})`,
                                transform: `rotate(${rot}deg) scale(${scale.toFixed(3)})`,
                            }}
                        />
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
                        {overflow > 0 && ` (${overflow} more not shown — the shelf holds ${MAX_ON_SHELF}.)`}
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
  query: "everything that is known", limit: 100, namespace: "${namespace}",
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
