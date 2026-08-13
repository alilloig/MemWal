import { useMemo, useState } from "react";
import type { MemoryBlob, SuiNetwork } from "../types";
import { formatBytes, short, suiObjectUrl, walruscanBlobUrl } from "../lib/format";
import { Snippet } from "./Snippet";

interface Props {
    blobs: MemoryBlob[];
    network: SuiNetwork;
    loading: boolean;
    progress: string | null;
    error: string | null;
    revealing: boolean;
    onRefresh: () => void;
    /** Runs recall() for one namespace and joins plaintext onto the rows. */
    onReveal: (namespace: string) => void;
}

export function InventoryTable({
    blobs,
    network,
    loading,
    progress,
    error,
    revealing,
    onRefresh,
    onReveal,
}: Props) {
    const namespaces = useMemo(
        () => [...new Set(blobs.map((b) => b.namespace))].sort(),
        [blobs],
    );
    const [nsFilter, setNsFilter] = useState<string | null>(null);

    const visible = nsFilter ? blobs.filter((b) => b.namespace === nsFilter) : blobs;
    const revealTarget = nsFilter ?? namespaces[0] ?? null;

    return (
        <section>
            <div className="section-head">
                <h2>Memories</h2>
                <div className="section-actions">
                    <button onClick={onRefresh} disabled={loading}>
                        {loading ? "Loading…" : "Refresh from chain"}
                    </button>
                    <button
                        className="primary"
                        disabled={revealing || revealTarget === null}
                        onClick={() => revealTarget !== null && onReveal(revealTarget)}
                        title="Runs recall() against the relayer and joins the decrypted text onto the on-chain rows by blob_id"
                    >
                        {revealing
                            ? "Decrypting…"
                            : `Reveal text${revealTarget ? ` (${revealTarget})` : ""}`}
                    </button>
                </div>
            </div>
            <p className="hint">
                This inventory is read from Sui, not from the relayer: each memory is a Walrus{" "}
                <code>Blob</code> object tagged with <code>memwal_*</code> attributes. Its content
                is SEAL-encrypted, so plaintext only appears after "Reveal text" asks the relayer
                to <code>recall()</code> that namespace (top 100 by similarity).
            </p>
            <Snippet
                code={`// Inventory — straight from the chain:
const page = await suiClient.listOwnedObjects({
  owner,                                        // MemWalAccount.owner
  type: \`\${walrusPackageId}::blob::Blob\`,       // Walrus blob objects
  include: { json: true },
})
// per blob: dynamic field b"metadata" → { memwal_namespace, memwal_agent_id, … }

// Plaintext — via the SDK (content is SEAL-encrypted on Walrus):
const res = await memwal.recall({ query: "everything", limit: 100, namespace })
// join res.results onto the inventory by blob_id`}
            />

            {namespaces.length > 1 && (
                <div className="chips">
                    <button
                        className={`chip ${nsFilter === null ? "on" : ""}`}
                        onClick={() => setNsFilter(null)}
                    >
                        all ({blobs.length})
                    </button>
                    {namespaces.map((ns) => (
                        <button
                            key={ns}
                            className={`chip ${nsFilter === ns ? "on" : ""}`}
                            onClick={() => setNsFilter(ns)}
                        >
                            {ns} ({blobs.filter((b) => b.namespace === ns).length})
                        </button>
                    ))}
                </div>
            )}

            {error && <p className="error">{error}</p>}
            {loading && progress && <p className="hint">{progress}</p>}

            {!loading && visible.length === 0 ? (
                <p className="empty">
                    No memories found on-chain for this account
                    {nsFilter ? ` in namespace "${nsFilter}"` : ""}. Store one below, then
                    refresh.
                </p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Text</th>
                                <th>Namespace</th>
                                <th>Agent</th>
                                <th>Size</th>
                                <th>Registered</th>
                                <th>Expires</th>
                                <th>Blob</th>
                                <th>Sui object</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((b) => (
                                <tr key={b.objectId}>
                                    <td className="text-cell">
                                        {b.text !== undefined ? (
                                            b.text
                                        ) : (
                                            <span className="encrypted">🔒 encrypted</span>
                                        )}
                                    </td>
                                    <td>
                                        <code>{b.namespace}</code>
                                    </td>
                                    <td>{b.agentId ? <code>{b.agentId}</code> : "—"}</td>
                                    <td>{formatBytes(b.size)}</td>
                                    <td>{b.registeredEpoch ?? "—"}</td>
                                    <td>
                                        {b.endEpoch !== null ? `epoch ${b.endEpoch}` : "—"}
                                    </td>
                                    <td className="mono">
                                        <a
                                            href={walruscanBlobUrl(network, b.blobId)}
                                            target="_blank"
                                            rel="noreferrer"
                                            title={b.blobId}
                                        >
                                            {short(b.blobId, 6, 4)}
                                        </a>
                                    </td>
                                    <td className="mono">
                                        <a
                                            href={suiObjectUrl(network, b.objectId)}
                                            target="_blank"
                                            rel="noreferrer"
                                            title={b.objectId}
                                        >
                                            {short(b.objectId, 6, 4)}
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
