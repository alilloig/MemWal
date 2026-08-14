import type { HealthResult } from "@mysten-incubation/memwal";
import type { AccountInfo, MemoryBlob, SuiNetwork } from "../types";
import { formatBytes, formatDate, short, suiObjectUrl } from "../lib/format";
import { Snippet } from "./Snippet";

interface Props {
    health: HealthResult | null;
    healthError: string | null;
    account: AccountInfo | null;
    accountId: string;
    blobs: MemoryBlob[];
    network: SuiNetwork;
}

export function OverviewCards({ health, healthError, account, accountId, blobs, network }: Props) {
    const namespaces = new Set(blobs.map((b) => b.namespace));
    const totalBytes = blobs.reduce((sum, b) => sum + (b.size ?? 0), 0);

    return (
        <section>
            <div className="section-head">
                <h2>Overview</h2>
                <Snippet
                    title="Where this data comes from"
                    code={`// Relayer status — SDK:
const health = await memwal.health()
// → { status, version, mode }

// Account + memory inventory — Sui chain (the SDK has no list API;
// the chain is the source of truth for what exists):
const account = await suiClient.getObject({ objectId: accountId, ... })
const blobs = await suiClient.listOwnedObjects({
  owner: account.owner,
  type: \`\${walrusPackageId}::blob::Blob\`,
  ...
}) // then read each blob's memwal_* metadata dynamic field`}
                />
            </div>
            <div className="cards">
                <div className="card stat">
                    <span className="stat-value">{blobs.length}</span>
                    <span className="stat-label">memories on-chain</span>
                </div>
                <div className="card stat">
                    <span className="stat-value">{namespaces.size}</span>
                    <span className="stat-label">
                        {namespaces.size === 1 ? "namespace" : "namespaces"}
                    </span>
                </div>
                <div className="card stat">
                    <span className="stat-value">{formatBytes(totalBytes)}</span>
                    <span className="stat-label">encrypted bytes on Walrus</span>
                </div>
                <div className="card stat">
                    {health ? (
                        <>
                            <span className={`stat-value ok`}>{health.status}</span>
                            <span className="stat-label">
                                relayer v{health.version}
                                {health.mode ? ` · ${health.mode}` : ""}
                            </span>
                        </>
                    ) : healthError ? (
                        <>
                            <span className="stat-value err">offline</span>
                            <span className="stat-label">{healthError}</span>
                        </>
                    ) : (
                        <>
                            <span className="stat-value">…</span>
                            <span className="stat-label">checking relayer</span>
                        </>
                    )}
                </div>
                <div className="card stat account-card">
                    {account ? (
                        <>
                            <span className="stat-value mono">
                                <a
                                    href={suiObjectUrl(network, accountId)}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {short(account.owner)}
                                </a>
                            </span>
                            <span className="stat-label">
                                account owner · {account.active ? "active" : "frozen"} ·{" "}
                                {account.delegateKeyCount}{" "}
                                {account.delegateKeyCount === 1 ? "delegate key" : "delegate keys"}
                                {account.createdAt ? ` · since ${formatDate(account.createdAt)}` : ""}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="stat-value err">?</span>
                            <span className="stat-label">account not loaded</span>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
