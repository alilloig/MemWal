import { useState } from "react";
import type { MemoryBlob, SuiNetwork } from "../types";
import { formatBytes, short, suiObjectUrl, walruscanBlobUrl } from "../lib/format";

/**
 * The Vault's shard view: every memory is a crystal shard. Sealed shards are
 * dim with a violet outline; revealed shards ignite. Grouping mirrors the
 * on-chain organization — the memwal_namespace metadata field.
 */
export function ShardGrid({
    blobs,
    network,
}: {
    blobs: MemoryBlob[];
    network: SuiNetwork;
}) {
    const byNamespace = new Map<string, MemoryBlob[]>();
    for (const b of blobs) {
        const list = byNamespace.get(b.namespace) ?? [];
        list.push(b);
        byNamespace.set(b.namespace, list);
    }

    return (
        <div className="shard-groups">
            {[...byNamespace.entries()].map(([ns, group]) => (
                <div className="shard-group" key={ns}>
                    <div className="shard-group__head">
                        <span className="shard-group__ns">{ns}</span>
                        <span className="shard-group__count">
                            {group.length} shard{group.length === 1 ? "" : "s"}
                        </span>
                    </div>
                    <div className="shard-grid">
                        {group.map((b) => (
                            <ShardCard key={b.objectId} blob={b} network={network} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ShardCard({ blob: b, network }: { blob: MemoryBlob; network: SuiNetwork }) {
    const [open, setOpen] = useState(false);
    const revealed = b.text !== undefined;

    return (
        <button
            type="button"
            className={`shard ${revealed ? "shard--lit" : "shard--sealed"} ${open ? "shard--open" : ""}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
        >
            <span className="shard__glyph" aria-hidden="true">
                <ShardGlyph lit={revealed} />
            </span>
            <span className="shard__body">
                <span className={`shard__text ${open ? "" : "shard__text--clamp"}`}>
                    {revealed ? b.text : "Sealed. Reveal the namespace to read this shard."}
                </span>
                <span className="shard__meta">
                    <span title="size on Walrus">{formatBytes(b.size)}</span>
                    {b.registeredEpoch !== null && <span title="registered at epoch">e{b.registeredEpoch}</span>}
                    {b.endEpoch !== null && <span title="stored until epoch">→ e{b.endEpoch}</span>}
                    {b.distance !== undefined && (
                        <span title="similarity distance from the reveal query">d={b.distance.toFixed(3)}</span>
                    )}
                </span>
                {open && (
                    <span className="shard__links" onClick={(e) => e.stopPropagation()}>
                        {b.agentId && (
                            <span className="shard__agent" title="memwal_agent_id">
                                agent {short(b.agentId, 8, 6)}
                            </span>
                        )}
                        <a href={walruscanBlobUrl(network, b.blobId)} target="_blank" rel="noreferrer">
                            blob {short(b.blobId, 6, 4)} ↗
                        </a>
                        <a href={suiObjectUrl(network, b.objectId)} target="_blank" rel="noreferrer">
                            object {short(b.objectId, 6, 4)} ↗
                        </a>
                    </span>
                )}
            </span>
        </button>
    );
}

/** A faceted crystal; `lit` fills it from within. */
function ShardGlyph({ lit }: { lit: boolean }) {
    return (
        <svg viewBox="0 0 24 34" width="22" height="31" fill="none">
            <defs>
                <linearGradient id="shard-lit" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#9BF3FF" />
                    <stop offset="1" stopColor="#67E8F9" stopOpacity="0.55" />
                </linearGradient>
            </defs>
            <path
                d="M12 1 L21 10 L17 30 L12 33 L7 30 L3 10 Z"
                fill={lit ? "url(#shard-lit)" : "rgba(167,139,250,0.10)"}
                stroke={lit ? "#B8F6FF" : "rgba(167,139,250,0.55)"}
                strokeWidth="1.2"
            />
            <path d="M12 1 L12 33 M3 10 L12 14 L21 10" stroke={lit ? "rgba(255,255,255,0.65)" : "rgba(167,139,250,0.3)"} strokeWidth="0.7" />
        </svg>
    );
}
