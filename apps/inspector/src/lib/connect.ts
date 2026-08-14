/**
 * One-click connect via the Walrus Memory dashboard.
 *
 * The SDK authenticates with an Ed25519 delegate key that must be registered
 * on the user's MemWalAccount (`add_delegate_key`). zkLogin, the wallet
 * signature, and the *sponsored* registration transaction can only run on the
 * dashboard (it holds the Enoki key, the OAuth client, and the sponsor), so a
 * third-party sample can't do them alone — it hands off to the dashboard and
 * gets the result back:
 *
 *   1. Generate the delegate keypair HERE, in this browser. The private key
 *      never leaves this origin (it goes to localStorage with the settings).
 *   2. Open the dashboard's `/connect/app` page IN A POPUP with the PUBLIC key
 *      in the query string. The palace tab stays alive underneath. There the
 *      user signs in (Google zkLogin or a Sui wallet) and approves; the
 *      dashboard registers the key on-chain with a sponsored transaction.
 *   3. The dashboard redirects the POPUP back to this origin's `?connect_return`
 *      URL with {accountId, network, …} in the fragment plus the CSRF state.
 *      Because that lands same-origin, the popup signals the palace tab over a
 *      BroadcastChannel and closes itself — no full-page navigation, so the
 *      palace can show "the gates recognize you" and play the entrance on a
 *      click.
 *
 * Everything the dashboard returns is public on-chain data; the only secret is
 * the key from step 1, which it never saw. Same-tab redirect (no popup) is kept
 * as a fallback for when the popup is blocked.
 */
import { delegateKeyToPublicKey, delegateKeyToSuiAddress } from "@mysten-incubation/memwal";
import type { InspectorSettings, SuiNetwork } from "../types";

// localStorage (shared across same-origin tabs), NOT sessionStorage: the popup
// is a separate window and does not inherit the palace tab's session storage,
// but must read the pending key/state when it returns to this origin.
const PENDING_KEY = "memwal-inspector-pending-connect";
const CHANNEL = "walrus-memory-connect";
const CONNECT_LABEL = "Walrus Memory Inspector";
const RETURN_PARAM = "connect_return";

interface PendingConnect {
    delegateKey: string;
    state: string;
    serverUrl: string;
    namespace: string;
    dashboardUrl: string;
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Generate a keypair, stash it with a CSRF token, and point `popup` (opened
 * synchronously by the caller so the browser doesn't block it) at the
 * dashboard consent page. Falls back to same-tab navigation if no popup.
 */
export async function beginDashboardConnect(opts: {
    dashboardUrl: string;
    serverUrl: string;
    namespace: string;
    popup?: Window | null;
}): Promise<void> {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const delegateKey = bytesToHex(seed);
    const publicKey = bytesToHex(await delegateKeyToPublicKey(delegateKey));
    const delegateAddress = await delegateKeyToSuiAddress(delegateKey);
    const state = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));

    const pending: PendingConnect = {
        delegateKey,
        state,
        serverUrl: opts.serverUrl,
        namespace: opts.namespace,
        dashboardUrl: opts.dashboardUrl,
    };
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    const usePopup = !!(opts.popup && !opts.popup.closed);

    // Popup return lands on `?connect_return=1` (main.tsx signals the opener and
    // closes). Same-tab return lands on the bare origin so App consumes the
    // fragment in place — WITHOUT the param, or main.tsx would treat the main
    // tab as a popup and strand it on the "Connected" screen.
    const returnUrl = new URL(window.location.origin + window.location.pathname);
    if (usePopup) returnUrl.searchParams.set(RETURN_PARAM, "1");

    const url = new URL("/connect/app", opts.dashboardUrl);
    url.search = new URLSearchParams({
        publicKey,
        delegateAddress,
        label: CONNECT_LABEL,
        relayer: opts.serverUrl,
        // `connectState`, not `state` — `state` is a reserved OAuth response
        // param and breaks the dashboard's Google sign-in redirect (WALM-86).
        connectState: state,
        redirect: returnUrl.toString(),
    }).toString();

    if (usePopup) {
        opts.popup!.location.href = url.toString();
    } else {
        // Popup blocked — fall back to same-tab navigation (loses the live
        // palace, but still connects; consumeDashboardCallback handles return).
        window.location.assign(url.toString());
    }
}

/** True when this document load is the dashboard popup returning to us. */
export function isConnectReturn(): boolean {
    return new URLSearchParams(window.location.search).get(RETURN_PARAM) === "1";
}

/**
 * Run inside the returning popup: validate the callback, broadcast the settings
 * to the palace tab, and close. Renders nothing. Returns a status the popup
 * page can show if `window.close()` is blocked.
 */
export function finishConnectReturn(): "sent" | "failed" {
    const settings = readCallback();
    if (settings) {
        try {
            new BroadcastChannel(CHANNEL).postMessage({ type: "connected", settings });
        } catch {
            // No BroadcastChannel: fall back to a storage ping the opener hears.
            localStorage.setItem(CHANNEL, JSON.stringify({ settings, t: Date.now() }));
        }
    }
    setTimeout(() => {
        try {
            window.close();
        } catch {
            /* close may be blocked; the page shows a "you can close this" note */
        }
    }, 250);
    return settings ? "sent" : "failed";
}

/**
 * Subscribe the palace tab to connect completions from the popup. Returns an
 * unsubscribe function.
 */
export function onConnected(cb: (settings: InspectorSettings) => void): () => void {
    let chan: BroadcastChannel | null = null;
    const onStorage = (e: StorageEvent) => {
        if (e.key !== CHANNEL || !e.newValue) return;
        try {
            const { settings } = JSON.parse(e.newValue) as { settings: InspectorSettings };
            if (settings) cb(settings);
        } catch {
            /* ignore malformed ping */
        }
    };
    try {
        chan = new BroadcastChannel(CHANNEL);
        chan.onmessage = (e) => {
            if (e.data?.type === "connected" && e.data.settings) cb(e.data.settings);
        };
    } catch {
        /* BroadcastChannel unsupported — storage event is the fallback */
    }
    window.addEventListener("storage", onStorage);
    return () => {
        chan?.close();
        window.removeEventListener("storage", onStorage);
    };
}

/**
 * Same-tab fallback: if THIS tab carries a callback fragment (popup was blocked
 * and we navigated in place), consume it and return ready-to-save settings.
 *
 * Module-level memo makes this idempotent — React StrictMode runs state
 * initializers twice, and the second run must see the same result.
 */
let consumed: InspectorSettings | null | undefined;

export function consumeDashboardCallback(): InspectorSettings | null {
    if (consumed === undefined) consumed = readCallback();
    return consumed;
}

/** Read + validate the dashboard callback fragment against the pending record. */
function readCallback(): InspectorSettings | null {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return null;
    const frag = new URLSearchParams(hash);
    const accountId = frag.get("accountId") ?? "";
    const state = frag.get("state") ?? "";
    if (!/^0x[0-9a-fA-F]{64}$/.test(accountId) || !state) return null;

    const rawPending = localStorage.getItem(PENDING_KEY);
    if (!rawPending) return null;

    // From here on this IS our callback — consume it even if validation fails,
    // so a mangled fragment can't be replayed.
    localStorage.removeItem(PENDING_KEY);
    history.replaceState(null, "", window.location.pathname);

    let pending: PendingConnect;
    try {
        pending = JSON.parse(rawPending) as PendingConnect;
    } catch {
        console.warn("memwal connect: pending record is corrupt — ignoring callback.");
        return null;
    }
    if (state !== pending.state) {
        console.warn("memwal connect: state token mismatch — ignoring callback (stale or forged return).");
        return null;
    }

    // Accept only the networks the inspector enumerates on; an unrecognised
    // value (e.g. a dashboard on devnet/localnet) would otherwise silently
    // resolve to the mainnet endpoints and show an empty, wrong-network palace.
    const reported = frag.get("network");
    const network: SuiNetwork | null =
        reported === "mainnet" || reported === "testnet" ? reported : null;
    if (!network) {
        console.warn(`memwal connect: dashboard reported unsupported network "${reported}" — expected mainnet or testnet.`);
        return null;
    }

    return {
        delegateKey: pending.delegateKey,
        accountId,
        serverUrl: pending.serverUrl,
        namespace: pending.namespace,
        network,
        suiGrpcUrl: "",
        walrusPackageId: "",
        dashboardUrl: pending.dashboardUrl,
    };
}
