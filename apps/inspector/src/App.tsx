import { useCallback, useEffect, useMemo, useState } from "react";
import { MemWal, type HealthResult } from "@mysten-incubation/memwal";
import type { AccountInfo, InspectorSettings, MemoryBlob } from "./types";
import { DEFAULT_SETTINGS, clearSettings, loadSettings, resolveSettings, saveSettings } from "./config";
import { createSuiClient, fetchAccount, fetchMemoryBlobs } from "./lib/chain";
import { consumeDashboardCallback, onConnected } from "./lib/connect";
import { SettingsForm } from "./components/SettingsForm";
import { OverviewCards } from "./components/OverviewCards";
import { SearchPanel } from "./components/SearchPanel";
import { ActionsPanel } from "./components/ActionsPanel";
import { NamespaceConsole, ShelfShards } from "./components/NamespaceRoom";
import { PalaceNav } from "./palace/PalaceNav";
import {
    ROTUNDA_SLOTS,
    STATIC_SCENES,
    namespaceScene,
    variantFor,
    type SceneDef,
    type SceneId,
} from "./palace/scenes";

type Phase =
    | { at: "connecting"; settings: null }
    | { at: "ready"; settings: InspectorSettings } // connected, waiting at the gates
    | { at: "inside"; settings: InspectorSettings; entrance: boolean }; // walking the palace

export function App() {
    // Same-tab fallback: if the popup was blocked and we navigated in place,
    // this tab carries the callback fragment — consume it and land at the gates
    // "ready" to enter (a click plays the doors-open cinematic).
    const [phase, setPhase] = useState<Phase>(() => {
        const connected = consumeDashboardCallback();
        if (connected) {
            saveSettings(connected);
            return { at: "ready", settings: connected };
        }
        const saved = loadSettings();
        // A returning visitor with saved settings walks straight in — no cinematic.
        return saved
            ? { at: "inside", settings: saved, entrance: false }
            : { at: "connecting", settings: null };
    });
    const [editing, setEditing] = useState(false);

    // The popup signals the palace tab here when the key is registered.
    useEffect(() => {
        return onConnected((s) => {
            saveSettings(s);
            setPhase({ at: "ready", settings: s });
        });
    }, []);

    const disconnect = () => {
        clearSettings();
        setPhase({ at: "connecting", settings: null });
    };

    if (phase.at === "connecting") {
        return (
            <PalaceNav
                scene={STATIC_SCENES.gates}
                onNavigate={() => {}}
                console={
                    <SettingsForm
                        initial={DEFAULT_SETTINGS}
                        onSave={(s) => {
                            saveSettings(s);
                            setPhase({ at: "ready", settings: s });
                        }}
                    />
                }
            />
        );
    }

    if (phase.at === "ready") {
        return (
            <PalaceNav
                scene={STATIC_SCENES.gates}
                onNavigate={() => {}}
                console={
                    <GateWelcome
                        settings={phase.settings}
                        onEnter={() => setPhase({ at: "inside", settings: phase.settings, entrance: true })}
                        onDisconnect={disconnect}
                    />
                }
            />
        );
    }

    return (
        <>
            <Palace
                // Remount when the account changes so no stale state leaks across accounts.
                key={`${phase.settings.accountId}-${phase.settings.network}`}
                settings={phase.settings}
                playEntrance={phase.entrance}
                onEdit={() => setEditing(true)}
                onDisconnect={disconnect}
            />
            {editing && (
                <div className="palace-modal" onClick={(e) => e.target === e.currentTarget && setEditing(false)}>
                    <SettingsForm
                        initial={phase.settings}
                        onSave={(s) => {
                            saveSettings(s);
                            setPhase({ at: "inside", settings: s, entrance: false });
                            setEditing(false);
                        }}
                        onCancel={() => setEditing(false)}
                    />
                </div>
            )}
        </>
    );
}

/** The gates recognize a connected visitor; a click opens them. */
function GateWelcome({
    settings,
    onEnter,
    onDisconnect,
}: {
    settings: InspectorSettings;
    onEnter: () => void;
    onDisconnect: () => void;
}) {
    return (
        <section>
            <div className="section-head">
                <h2>The gates recognize you</h2>
            </div>
            <p className="hint">
                Connected to <code>{settings.accountId.slice(0, 10)}…{settings.accountId.slice(-6)}</code>{" "}
                on {settings.network}. Step inside — every room is a live view over this account.
            </p>
            <div className="form-actions">
                <button className="primary" onClick={onEnter}>
                    Enter the palace →
                </button>
                <button onClick={onDisconnect}>Disconnect</button>
            </div>
        </section>
    );
}

/**
 * Per-room fly-in clip, played on arrival; rooms without one fall back to the
 * CSS zoom-dissolve. (The observatory still — a scrying orb — trips both video
 * models' content filters, so that room dissolves instead of flying in.)
 */
function arrivalClip(id: SceneId): string | null {
    switch (id) {
        case "atrium": return "/palace/atrium.mp4";
        case "vault": return "/palace/vault.mp4";
        case "scriptorium": return "/palace/scriptorium.mp4";
        case "gates":
        case "observatory":
            return null;
        default:
            // namespace room — the clip matching its library variant
            return `/palace/lib_${variantFor(id.slice(3)).key}.mp4`;
    }
}

function Palace({
    settings,
    playEntrance,
    onEdit,
    onDisconnect,
}: {
    settings: InspectorSettings;
    playEntrance: boolean;
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

    // ---- palace position ----
    // Entering through the gates lands at the atrium with the doors-open flight
    // playing over it; a returning visitor is dropped straight into the atrium.
    const [sceneId, setSceneId] = useState<SceneId>("atrium");
    const [cinematic, setCinematic] = useState<string | null>(
        playEntrance ? "/palace/gates.mp4" : null,
    );
    const endCinematic = useCallback(() => setCinematic(null), []);
    const [selectedShard, setSelectedShard] = useState<string | null>(null);
    const navigate = useCallback((to: SceneId) => {
        setSelectedShard(null);
        setSceneId(to);
        // Play the target room's fly-in clip over the (already-swapped) scene;
        // the clip settles on the room still, so the hand-off is seamless.
        setCinematic(arrivalClip(to));
    }, []);

    // ---- account data ----
    const [health, setHealth] = useState<HealthResult | null>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [account, setAccount] = useState<AccountInfo | null>(null);
    const [blobs, setBlobs] = useState<MemoryBlob[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revealing, setRevealing] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const acct = await fetchAccount(suiClient, resolved.accountId);
            setAccount(acct);
            const found = await fetchMemoryBlobs(suiClient, acct.owner, resolved.walrusPackageId);
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
     * "Decrypt room" = the recall-join trick. The SDK has no get-by-blob-id,
     * so we run a broad recall (top 100 by similarity) for the namespace and
     * join results onto the shards by blob_id.
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

    // ---- scene resolution ----
    const scene: SceneDef = useMemo(() => {
        if (sceneId.startsWith("ns:")) return namespaceScene(sceneId.slice(3));
        const base = STATIC_SCENES[sceneId as Exclude<SceneId, `ns:${string}`>];
        if (sceneId !== "vault") return base;
        // The rotunda's doorways = the account's namespaces.
        return {
            ...base,
            hotspots: [
                ...namespaces.slice(0, ROTUNDA_SLOTS.length).map((ns, i) => ({
                    to: `ns:${ns}` as SceneId,
                    label: ns,
                    x: ROTUNDA_SLOTS[i].x,
                    y: ROTUNDA_SLOTS[i].y,
                    kind: "door" as const,
                })),
                ...base.hotspots,
            ],
        };
    }, [sceneId, namespaces]);

    const currentNs = sceneId.startsWith("ns:") ? sceneId.slice(3) : null;
    const nsBlobs = useMemo(
        () => (currentNs ? blobs.filter((b) => b.namespace === currentNs) : []),
        [blobs, currentNs],
    );

    const consolePanel = (() => {
        switch (sceneId) {
            case "gates":
                return null;
            case "atrium":
                return (
                    <OverviewCards
                        health={health}
                        healthError={healthError}
                        account={account}
                        accountId={resolved.accountId}
                        blobs={blobs}
                        network={resolved.network}
                    />
                );
            case "vault":
                return (
                    <VaultHubPanel
                        blobs={blobs}
                        namespaces={namespaces}
                        loading={loading}
                        error={error}
                        onRefresh={refresh}
                        onEnter={(ns) => navigate(`ns:${ns}`)}
                    />
                );
            case "observatory":
                return (
                    <SearchPanel
                        memwal={memwal}
                        namespaces={namespaces}
                        defaultNamespace={resolved.namespace}
                        network={resolved.network}
                    />
                );
            case "scriptorium":
                return (
                    <ActionsPanel
                        memwal={memwal}
                        defaultNamespace={resolved.namespace}
                        onChanged={refresh}
                    />
                );
            default:
                return (
                    <NamespaceConsole
                        namespace={currentNs!}
                        blobs={nsBlobs}
                        network={resolved.network}
                        selectedId={selectedShard}
                        revealing={revealing}
                        onReveal={() => reveal(currentNs!)}
                        onSelect={setSelectedShard}
                    />
                );
        }
    })();

    return (
        <PalaceNav
            scene={scene}
            onNavigate={navigate}
            banner={error}
            cinematic={cinematic}
            onCinematicEnd={endCinematic}
            console={consolePanel}
            overlay={
                currentNs ? (
                    <ShelfShards namespace={currentNs} blobs={nsBlobs} selectedId={selectedShard} onSelect={setSelectedShard} />
                ) : null
            }
            topRight={
                <>
                    <button onClick={onEdit}>Settings</button>
                    <button onClick={onDisconnect}>Disconnect</button>
                </>
            }
        />
    );
}

/** The rotunda's console: every doorway, including any beyond the visible seven. */
function VaultHubPanel({
    blobs,
    namespaces,
    loading,
    error,
    onRefresh,
    onEnter,
}: {
    blobs: MemoryBlob[];
    namespaces: string[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    onEnter: (ns: string) => void;
}) {
    return (
        <section>
            <div className="section-head">
                <h2>The Vault</h2>
                <div className="section-actions">
                    <button onClick={onRefresh} disabled={loading}>
                        {loading ? "Reading chain…" : "Refresh from chain"}
                    </button>
                </div>
            </div>
            <p className="hint">
                Each doorway is a namespace — the <code>memwal_namespace</code> metadata of
                your on-chain blobs. Click a glowing door (or a row below) to step into
                that room. Every namespace gets its own chamber; no two look quite alike.
            </p>
            {error && <p className="error">{error}</p>}
            <div className="vault-list">
                {namespaces.map((ns) => {
                    const inNs = blobs.filter((b) => b.namespace === ns);
                    const sealed = inNs.filter((b) => b.text === undefined).length;
                    const v = variantFor(ns);
                    return (
                        <button key={ns} className="vault-list__row" onClick={() => onEnter(ns)}>
                            <span className="vault-list__dot" style={{ background: v.accent }} />
                            <span className="vault-list__ns">{ns}</span>
                            <span className="vault-list__meta">
                                {inNs.length} shard{inNs.length === 1 ? "" : "s"}
                                {sealed > 0 ? ` · ${sealed} sealed` : " · all lit"}
                            </span>
                        </button>
                    );
                })}
                {namespaces.length === 0 && !loading && (
                    <p className="empty">No namespaces yet — inscribe a first memory in the Scriptorium.</p>
                )}
            </div>
        </section>
    );
}
