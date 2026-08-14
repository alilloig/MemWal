import { useEffect, useRef, useState } from "react";
import type { InspectorSettings, SuiNetwork } from "../types";
import { SUI_GRPC_URLS, WALRUS_PACKAGE_IDS } from "../config";
import { beginDashboardConnect } from "../lib/connect";

// How long to wait for the popup to signal back before giving up. The connect
// completes by the popup broadcasting to this tab (App's onConnected), which
// unmounts this form; if that never happens (popup closed, dashboard 404, a
// rejected callback) the watchdog below clears the busy state instead of
// leaving the button stuck on "Waiting for the dashboard…" forever.
const CONNECT_TIMEOUT_MS = 180_000;
const POPUP_POLL_MS = 500;

interface Props {
    initial: InspectorSettings;
    onSave: (s: InspectorSettings) => void;
    onCancel?: () => void;
}

export function SettingsForm({ initial, onSave, onCancel }: Props) {
    const [form, setForm] = useState<InspectorSettings>(initial);
    // Manual entry starts collapsed for first-time visitors; when the user is
    // editing existing settings, open it so the fields are directly reachable.
    const [showManual, setShowManual] = useState(!!onCancel);
    const [connecting, setConnecting] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);
    const watchdog = useRef<{ poll?: number; timer?: number }>({});

    function clearWatchdog() {
        if (watchdog.current.poll) clearInterval(watchdog.current.poll);
        if (watchdog.current.timer) clearTimeout(watchdog.current.timer);
        watchdog.current = {};
    }
    // On success the form unmounts (App swaps to the connected phase); make sure
    // the watchdog timers don't outlive it.
    useEffect(() => clearWatchdog, []);

    function set<K extends keyof InspectorSettings>(key: K, value: InspectorSettings[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    // A malformed key would throw inside MemWal.create() during render — gate
    // save on the shapes the SDK requires (Ed25519 hex key, 0x-prefixed id).
    const keyOk = /^(0x)?[0-9a-fA-F]{64}$/.test(form.delegateKey.trim());
    const accountOk = /^0x[0-9a-fA-F]{64}$/.test(form.accountId.trim());
    const canSave = keyOk && accountOk;

    async function connect() {
        setConnecting(true);
        setConnectError(null);
        // Open the popup SYNCHRONOUSLY in the click handler — a popup opened
        // later (after the async keygen) is blocked. beginDashboardConnect
        // then points it at the dashboard once the key is ready.
        const popup = window.open("about:blank", "walrus-memory-connect", "width=480,height=720");
        try {
            // Generates the delegate key in this browser, then sends the popup
            // to the dashboard, where the user signs in (Google zkLogin or Sui
            // wallet) and approves. The palace stays open and is signalled when
            // the popup returns connected.
            await beginDashboardConnect({
                dashboardUrl: form.dashboardUrl.trim().replace(/\/+$/, ""),
                serverUrl: form.serverUrl.trim().replace(/\/+$/, ""),
                namespace: form.namespace.trim() || "default",
                popup,
            });
            // Popup is under way — keep the button busy until it signals back,
            // but arm a watchdog so a closed/abandoned/404 popup can't leave the
            // tab stuck on "Waiting for the dashboard…". Success unmounts us and
            // the effect above clears these.
            clearWatchdog();
            const give_up = (msg: string) => {
                clearWatchdog();
                setConnecting(false);
                setConnectError(msg);
            };
            if (popup) {
                watchdog.current.poll = window.setInterval(() => {
                    if (popup.closed)
                        give_up("The connect window closed before finishing. Try again, or use manual setup below.");
                }, POPUP_POLL_MS);
            }
            watchdog.current.timer = window.setTimeout(
                () => give_up("Connection timed out. Try again, or use manual setup below."),
                CONNECT_TIMEOUT_MS,
            );
        } catch (e) {
            popup?.close();
            clearWatchdog();
            setConnectError(e instanceof Error ? e.message : String(e));
            setConnecting(false);
        }
    }

    return (
        <div className="settings-form card">
            <h2>Connect to a Walrus Memory account</h2>
            <p className="hint">
                Opens the Walrus Memory dashboard in a new tab — sign in with Google or a
                Sui wallet and approve. An access key is created in this browser and
                registered to your account there; the palace stays open and lights up when
                you return. (Needs a dashboard that hosts the <code>/connect/app</code>
                route; if it doesn't yet, use manual setup below.)
            </p>

            <div className="form-actions">
                <button type="button" className="primary" onClick={connect} disabled={connecting}>
                    {connecting ? "Waiting for the dashboard…" : "Connect with Walrus Memory"}
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
            {connectError && <p className="error">{connectError}</p>}

            <details
                className="advanced"
                open={showManual}
                onToggle={(e) => setShowManual((e.target as HTMLDetailsElement).open)}
            >
                <summary>Manual setup &amp; advanced options</summary>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (canSave) {
                            onSave({
                                ...form,
                                delegateKey: form.delegateKey.trim(),
                                accountId: form.accountId.trim(),
                                serverUrl: form.serverUrl.trim().replace(/\/+$/, ""),
                                namespace: form.namespace.trim() || "default",
                                dashboardUrl: form.dashboardUrl.trim().replace(/\/+$/, ""),
                            });
                        }
                    }}
                >
                    <p className="hint">
                        Already have credentials? These are the same values{" "}
                        <code>MemWal.create()</code> takes. Everything stays in your
                        browser's localStorage.
                    </p>

                    <label>
                        Delegate private key (hex)
                        <input
                            type="password"
                            value={form.delegateKey}
                            onChange={(e) => set("delegateKey", e.target.value)}
                            placeholder="ed25519 delegate key registered on your account"
                            autoComplete="off"
                        />
                    </label>

                    <label>
                        Account ID (MemWalAccount object on Sui)
                        <input
                            value={form.accountId}
                            onChange={(e) => set("accountId", e.target.value)}
                            placeholder="0x…"
                        />
                    </label>

                    <label>
                        Relayer URL
                        <input
                            value={form.serverUrl}
                            onChange={(e) => set("serverUrl", e.target.value)}
                            placeholder="https://relayer.memory.walrus.xyz"
                        />
                    </label>

                    <div className="settings-row">
                        <label>
                            Default namespace
                            <input
                                value={form.namespace}
                                onChange={(e) => set("namespace", e.target.value)}
                                placeholder="default"
                            />
                        </label>
                        <label>
                            Sui network
                            <select
                                value={form.network}
                                onChange={(e) => set("network", e.target.value as SuiNetwork)}
                            >
                                <option value="mainnet">mainnet</option>
                                <option value="testnet">testnet</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        Dashboard URL (one-click connect)
                        <input
                            value={form.dashboardUrl}
                            onChange={(e) => set("dashboardUrl", e.target.value)}
                            placeholder="https://memory.walrus.xyz"
                        />
                    </label>

                    <label>
                        Sui gRPC endpoint
                        <input
                            value={form.suiGrpcUrl}
                            onChange={(e) => set("suiGrpcUrl", e.target.value)}
                            placeholder={SUI_GRPC_URLS[form.network]}
                        />
                    </label>
                    <label>
                        Walrus package ID (Blob object type)
                        <input
                            value={form.walrusPackageId}
                            onChange={(e) => set("walrusPackageId", e.target.value)}
                            placeholder={WALRUS_PACKAGE_IDS[form.network]}
                        />
                    </label>

                    {form.delegateKey.trim() !== "" && !keyOk && (
                        <p className="hint">Delegate key must be 64 hex characters.</p>
                    )}
                    {form.accountId.trim() !== "" && !accountOk && (
                        <p className="hint">Account ID must be 0x + 64 hex characters.</p>
                    )}
                    <div className="form-actions">
                        <button type="submit" className="primary" disabled={!canSave}>
                            Save credentials
                        </button>
                    </div>
                </form>
            </details>
        </div>
    );
}
