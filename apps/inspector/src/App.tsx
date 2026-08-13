import { useCallback, useEffect, useMemo, useState } from "react";
import { MemWal, type HealthResult } from "@mysten-incubation/memwal";
import type { AccountInfo, InspectorSettings, MemoryBlob } from "./types";
import { DEFAULT_SETTINGS, clearSettings, loadSettings, resolveSettings, saveSettings } from "./config";
import { createSuiClient, fetchAccount, fetchMemoryBlobs } from "./lib/chain";
import { consumeDashboardCallback } from "./lib/connect";
import { SettingsForm } from "./components/SettingsForm";
import { OverviewCards } from "./components/OverviewCards";
import { InventoryTable } from "./components/InventoryTable";
import { SearchPanel } from "./components/SearchPanel";
import { ActionsPanel } from "./components/ActionsPanel";

export function App() {
    const [settings, setSettings] = useState<InspectorSettings | null>(() => {
        // Returning from the dashboard connect flow? The URL fragment carries
        // the account info; the delegate key waited in sessionStorage.
        const connected = consumeDashboardCallback();
        if (connected) {
            saveSettings(connected);
            return connected;
        }
        return loadSettings();
    });
    const [editing, setEditing] = useState(false);

    if (!settings || editing) {
        return (
            <div className="shell">
                <Header onEdit={null} />
                <SettingsForm
                    initial={settings ?? DEFAULT_SETTINGS}
                    onSave={(s) => {
                        saveSettings(s);
                        setSettings(s);
                        setEditing(false);
                    }}
                    onCancel={settings ? () => setEditing(false) : undefined}
                />
            </div>
        );
    }

    return (
        <Inspector
            // Remount when the account changes so no stale state leaks across accounts.
            key={`${settings.accountId}-${settings.network}`}
            settings={settings}
            onEdit={() => setEditing(true)}
            onDisconnect={() => {
                clearSettings();
                setSettings(null);
            }}
        />
    );
}

function Header({ onEdit, onDisconnect }: { onEdit: (() => void) | null; onDisconnect?: () => void }) {
    return (
        <header>
            <h1>
                <span className="logo">◍</span> Walrus Memory Inspector
            </h1>
            <span className="tagline">
                every memory your agent stored — straight from the chain
            </span>
            {onEdit && (
                <div className="header-actions">
                    <button onClick={onEdit}>Settings</button>
                    {onDisconnect && <button onClick={onDisconnect}>Disconnect</button>}
                </div>
            )}
        </header>
    );
}

function Inspector({
    settings,
    onEdit,
    onDisconnect,
}: {
    settings: InspectorSettings;
    onEdit: () => void;
    onDisconnect: () => void;
}) {
    const resolved = useMemo(() => resolveSettings(settings), [settings]);

    const memwal = useMemo(
        () =>
            MemWal.create({
                key: resolved.delegateKey,
                accountId: resolved.accountId,
                serverUrl: resolved.serverUrl,
                namespace: resolved.namespace,
            }),
        [resolved],
    );
    const suiClient = useMemo(
        () => createSuiClient(resolved.network, resolved.suiGrpcUrl),
        [resolved],
    );

    const [health, setHealth] = useState<HealthResult | null>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [account, setAccount] = useState<AccountInfo | null>(null);
    const [blobs, setBlobs] = useState<MemoryBlob[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [revealing, setRevealing] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        setProgress("Reading MemWalAccount…");
        try {
            const acct = await fetchAccount(suiClient, resolved.accountId);
            setAccount(acct);
            setProgress("Listing Walrus blob objects…");
            const found = await fetchMemoryBlobs(
                suiClient,
                acct.owner,
                resolved.walrusPackageId,
                setProgress,
            );
            // Keep any plaintext already revealed for blobs that still exist.
            setBlobs((prev) => {
                const textByBlobId = new Map(
                    prev.filter((b) => b.text !== undefined).map((b) => [b.blobId, b]),
                );
                return found.map((b) => {
                    const known = textByBlobId.get(b.blobId);
                    return known ? { ...b, text: known.text, distance: known.distance } : b;
                });
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
            setProgress(null);
        }
    }, [suiClient, resolved]);

    useEffect(() => {
        memwal
            .health()
            .then((h) => setHealth(h))
            .catch((e) => setHealthError(e instanceof Error ? e.message : String(e)));
        void refresh();
    }, [memwal, refresh]);

    /**
     * "Reveal text" = the recall-join trick. The SDK has no get-by-blob-id, so
     * we run a broad recall (top 100 by similarity) for the namespace and join
     * results onto the on-chain rows by blob_id. Rows that don't surface stay
     * encrypted — an honest illustration of the privacy model.
     */
    const reveal = useCallback(
        async (namespace: string) => {
            setRevealing(true);
            setError(null);
            try {
                const res = await memwal.recall({
                    query: "everything that is known",
                    limit: 100,
                    namespace,
                });
                const byBlobId = new Map(res.results.map((r) => [r.blob_id, r]));
                setBlobs((prev) =>
                    prev.map((b) => {
                        const hit = byBlobId.get(b.blobId);
                        return hit ? { ...b, text: hit.text, distance: hit.distance } : b;
                    }),
                );
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setRevealing(false);
            }
        },
        [memwal],
    );

    const namespaces = useMemo(
        () => [...new Set(blobs.map((b) => b.namespace))].sort(),
        [blobs],
    );

    return (
        <div className="shell">
            <Header onEdit={onEdit} onDisconnect={onDisconnect} />
            <OverviewCards
                health={health}
                healthError={healthError}
                account={account}
                accountId={resolved.accountId}
                blobs={blobs}
                network={resolved.network}
            />
            <InventoryTable
                blobs={blobs}
                network={resolved.network}
                loading={loading}
                progress={progress}
                error={error}
                revealing={revealing}
                onRefresh={refresh}
                onReveal={reveal}
            />
            <SearchPanel
                memwal={memwal}
                namespaces={namespaces}
                defaultNamespace={resolved.namespace}
                network={resolved.network}
            />
            <ActionsPanel
                memwal={memwal}
                defaultNamespace={resolved.namespace}
                onChanged={refresh}
            />
            <footer>
                Sample app for{" "}
                <a href="https://memory.walrus.xyz" target="_blank" rel="noreferrer">
                    Walrus Memory
                </a>{" "}
                — inventory read from Sui, content decrypted through the relayer via{" "}
                <code>@mysten-incubation/memwal</code>.
            </footer>
        </div>
    );
}
