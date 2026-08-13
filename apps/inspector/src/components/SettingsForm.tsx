import { useState } from "react";
import type { InspectorSettings, SuiNetwork } from "../types";
import { SUI_GRPC_URLS, WALRUS_PACKAGE_IDS } from "../config";
import { beginDashboardConnect } from "../lib/connect";

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

    function set<K extends keyof InspectorSettings>(key: K, value: InspectorSettings[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    const canSave = form.delegateKey.trim() !== "" && form.accountId.trim() !== "";

    async function connect() {
        setConnecting(true);
        setConnectError(null);
        try {
            // Generates the delegate key in this browser, then navigates to the
            // dashboard, where the user signs in (Google zkLogin or Sui wallet)
            // and clicks Approve. The dashboard sends them back here connected.
            await beginDashboardConnect({
                dashboardUrl: form.dashboardUrl.trim().replace(/\/+$/, ""),
                serverUrl: form.serverUrl.trim().replace(/\/+$/, ""),
                namespace: form.namespace.trim() || "default",
            });
            // Navigation is under way — keep the button in its busy state.
        } catch (e) {
            setConnectError(e instanceof Error ? e.message : String(e));
            setConnecting(false);
        }
    }

    return (
        <div className="settings-form card">
            <h2>Connect to a Walrus Memory account</h2>
            <p className="hint">
                Sign in on the Walrus Memory dashboard — with Google or a Sui wallet —
                and approve this inspector. No keys to copy: an access key is created in
                this browser and registered to your account with one click.
            </p>

            <div className="form-actions">
                <button type="button" className="primary" onClick={connect} disabled={connecting}>
                    {connecting ? "Opening the Walrus Memory dashboard…" : "Connect with Walrus Memory"}
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
