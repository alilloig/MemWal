import { useRef, useState } from "react";
import type { MemWal } from "@mysten-incubation/memwal";
import { Snippet } from "./Snippet";

interface Props {
    memwal: MemWal;
    defaultNamespace: string;
    /** Called after a write lands so the parent can refresh the inventory. */
    onChanged: () => void;
}

type Mode = "remember" | "analyze" | "restore";

export function ActionsPanel({ memwal, defaultNamespace, onChanged }: Props) {
    const [mode, setMode] = useState<Mode>("remember");
    const [text, setText] = useState("");
    const [namespace, setNamespace] = useState(defaultNamespace);
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const logRef = useRef<string[]>([]);

    function push(line: string) {
        logRef.current = [...logRef.current, line];
        setLog(logRef.current);
    }

    function reset() {
        logRef.current = [];
        setLog([]);
    }

    async function trackJob(jobId: string) {
        // waitForRememberJob polls the relayer until the async pipeline
        // (embed → SEAL encrypt → Walrus upload → index) reaches done/failed.
        push(`job ${jobId}: waiting…`);
        const result = await memwal.waitForRememberJob(jobId);
        push(`job ${jobId}: done → blob ${result.blob_id}`);
    }

    async function run() {
        if (busy) return;
        const ns = namespace.trim() || defaultNamespace;
        setBusy(true);
        reset();
        try {
            if (mode === "remember") {
                if (!text.trim()) return;
                push(`remember("${text.trim().slice(0, 60)}…", "${ns}")`);
                const job = await memwal.remember(text.trim(), ns);
                await trackJob(job.job_id);
                setText("");
            } else if (mode === "analyze") {
                if (!text.trim()) return;
                push(`analyze(…, "${ns}") — extracting facts with an LLM`);
                const res = await memwal.analyze(text.trim(), ns);
                push(`${res.fact_count} facts extracted:`);
                for (const fact of res.facts) push(`  • ${fact.text}`);
                // allSettled, not all: one failed job must not hide the ones
                // that landed, and the chain refresh below must still run.
                const outcomes = await Promise.allSettled(res.job_ids.map((id) => trackJob(id)));
                const failed = outcomes.filter((o) => o.status === "rejected");
                for (const f of failed) {
                    push(`  ✗ job failed: ${(f as PromiseRejectedResult).reason}`);
                }
                setText("");
            } else {
                push(`restore("${ns}") — re-indexing from on-chain blobs`);
                const res = await memwal.restore(ns, 100);
                push(
                    `restored ${res.restored}, skipped ${res.skipped} (already indexed), ` +
                        `${res.total} blobs on-chain`,
                );
            }
            onChanged();
        } catch (e) {
            push(`error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setBusy(false);
        }
    }

    const snippets: Record<Mode, string> = {
        remember: `// Returns immediately with a job id; the pipeline
// (embed → SEAL encrypt → Walrus upload → index) runs async.
const job = await memwal.remember(${JSON.stringify(text || "User prefers dark mode.")}, ${JSON.stringify(namespace)})
const result = await memwal.waitForRememberJob(job.job_id)
// result.blob_id — the Walrus blob you'll see appear in the inventory`,
        analyze: `// LLM extracts memorable facts, then stores each as its own memory.
const res = await memwal.analyze(${JSON.stringify(text || "I live in Madrid and I use TypeScript.")}, ${JSON.stringify(namespace)})
// res.facts: [{ text, job_id }] — one remember job per fact
await Promise.all(res.job_ids.map((id) => memwal.waitForRememberJob(id)))`,
        restore: `// Rebuild the relayer's vector index for a namespace from the chain.
// Incremental: only blobs missing from the index are re-embedded.
const res = await memwal.restore(${JSON.stringify(namespace)}, 100)
// { restored, skipped, total }`,
    };

    return (
        <section>
            <div className="section-head">
                <h2>Write &amp; maintain</h2>
                <Snippet code={snippets[mode]} />
            </div>
            <div className="chips">
                {(["remember", "analyze", "restore"] as Mode[]).map((m) => (
                    <button
                        key={m}
                        className={`chip ${mode === m ? "on" : ""}`}
                        onClick={() => setMode(m)}
                    >
                        {m}
                    </button>
                ))}
            </div>
            <p className="hint">
                {mode === "remember" &&
                    "Store one memory verbatim. Watch the job pipeline finish, then refresh the inventory to see the new blob on-chain."}
                {mode === "analyze" &&
                    "Paste free-form text — an LLM extracts the memorable facts and stores each one as a separate memory."}
                {mode === "restore" &&
                    "Portability demo: rebuild the relayer's index for a namespace from the on-chain blobs. This is what makes memories recoverable on any relayer."}
            </p>
            <div className="action-row">
                {mode !== "restore" && (
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={3}
                        placeholder={
                            mode === "remember"
                                ? "User prefers dark mode and uses TypeScript."
                                : "Paste a conversation or notes — facts get extracted."
                        }
                    />
                )}
                <div className="action-controls">
                    <input
                        value={namespace}
                        onChange={(e) => setNamespace(e.target.value)}
                        placeholder="namespace"
                        title="namespace"
                    />
                    <button
                        className="primary"
                        onClick={run}
                        disabled={busy || (mode !== "restore" && !text.trim())}
                    >
                        {busy ? "Working…" : mode}
                    </button>
                </div>
            </div>
            {log.length > 0 && (
                <pre className="joblog">
                    {log.join("\n")}
                </pre>
            )}
        </section>
    );
}
