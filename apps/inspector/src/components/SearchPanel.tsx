import { useState } from "react";
import type { MemWal, RecallMemory } from "@mysten-incubation/memwal";
import type { SuiNetwork } from "../types";
import { short, walruscanBlobUrl } from "../lib/format";
import { Snippet } from "./Snippet";

interface Props {
    memwal: MemWal;
    namespaces: string[];
    defaultNamespace: string;
    network: SuiNetwork;
}

export function SearchPanel({ memwal, namespaces, defaultNamespace, network }: Props) {
    const [query, setQuery] = useState("");
    const [namespace, setNamespace] = useState(defaultNamespace);
    const [limit, setLimit] = useState(10);
    const [maxDistance, setMaxDistance] = useState<string>("");
    const [results, setResults] = useState<RecallMemory[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function run() {
        // The button is disabled while busy, but the Enter key is not — guard
        // here so overlapping recalls can't resolve out of order.
        if (busy || !query.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const res = await memwal.recall({
                query: query.trim(),
                limit,
                namespace,
                ...(maxDistance !== "" ? { maxDistance: Number(maxDistance) } : {}),
            });
            setResults(res.results);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setResults(null);
        } finally {
            setBusy(false);
        }
    }

    const nsOptions = [...new Set([defaultNamespace, ...namespaces])].sort();

    return (
        <section>
            <div className="section-head">
                <h2>Semantic search</h2>
                <Snippet
                    code={`const res = await memwal.recall({
  query: ${JSON.stringify(query || "what does the user prefer?")},
  limit: ${limit},
  namespace: ${JSON.stringify(namespace)},${maxDistance !== "" ? `\n  maxDistance: ${maxDistance}, // drop weak matches client-side` : ""}
})
// res.results: [{ blob_id, text, distance }] — lower distance = more similar`}
                />
            </div>
            <p className="hint">
                <code>recall()</code> is the SDK's only read API: it embeds the query, searches
                the vector index scoped to your account + namespace, downloads matching blobs
                from Walrus, and SEAL-decrypts them server-side.
            </p>
            <div className="search-row">
                <input
                    className="grow"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && run()}
                    placeholder="Ask anything — e.g. what are the user's preferences?"
                />
                <select value={namespace} onChange={(e) => setNamespace(e.target.value)}>
                    {nsOptions.map((ns) => (
                        <option key={ns} value={ns}>
                            {ns}
                        </option>
                    ))}
                </select>
                <input
                    type="number"
                    min={1}
                    max={100}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value) || 10)}
                    title="limit (max 100)"
                    className="narrow"
                />
                <input
                    type="number"
                    step="0.05"
                    min={0}
                    max={2}
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(e.target.value)}
                    placeholder="max dist"
                    title="maxDistance — optional client-side relevance cutoff"
                    className="narrow"
                />
                <button className="primary" onClick={run} disabled={busy || !query.trim()}>
                    {busy ? "Searching…" : "Recall"}
                </button>
            </div>

            {error && <p className="error">{error}</p>}
            {results !== null && (
                <div className="results">
                    {results.length === 0 ? (
                        <p className="empty">No matches.</p>
                    ) : (
                        results.map((r) => (
                            <div className="card result" key={r.blob_id}>
                                <div className="result-meta">
                                    <span
                                        className="distance-bar"
                                        title={`cosine distance ${r.distance.toFixed(4)}`}
                                    >
                                        <span
                                            style={{
                                                width: `${Math.max(0, Math.min(1, 1 - r.distance)) * 100}%`,
                                            }}
                                        />
                                    </span>
                                    <span className="mono distance">
                                        d={r.distance.toFixed(3)}
                                    </span>
                                    <a
                                        className="mono"
                                        href={walruscanBlobUrl(network, r.blob_id)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {short(r.blob_id, 6, 4)}
                                    </a>
                                </div>
                                <p>{r.text}</p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </section>
    );
}
