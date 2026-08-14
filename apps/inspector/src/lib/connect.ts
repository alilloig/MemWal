/**
 * One-click connect via the Walrus Memory dashboard.
 *
 * The SDK authenticates with an Ed25519 delegate key that must be registered
 * on the user's MemWalAccount (`add_delegate_key`). Instead of asking the user
 * to paste a key + account ID, we do what the MCP bridge's `loginFlow` does —
 * adapted for a web app:
 *
 *   1. Generate the delegate keypair HERE, in this browser. The private key
 *      never leaves this origin (it goes to localStorage with the settings).
 *   2. Send the user to the dashboard's `/connect/app` page with the PUBLIC
 *      key in the query string. There they sign in with Google (zkLogin) or
 *      a Sui wallet and approve — the dashboard registers the key on-chain
 *      with a sponsored transaction, so the user needs no gas.
 *   3. The dashboard redirects back here with {accountId, network, …} in the
 *      URL *fragment* (never sent to any server), plus our CSRF state token.
 *
 * Everything the dashboard returns is public on-chain data; the only secret
 * is the key from step 1, which it never saw.
 */
import { delegateKeyToPublicKey, delegateKeyToSuiAddress } from "@mysten-incubation/memwal";
import type { InspectorSettings, SuiNetwork } from "../types";

const PENDING_KEY = "memwal-inspector-pending-connect";
const CONNECT_LABEL = "Walrus Memory Inspector";

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
 * Generate a keypair, stash it with a CSRF token in sessionStorage, and
 * navigate to the dashboard's consent page. Resolves just before navigation.
 */
export async function beginDashboardConnect(opts: {
    dashboardUrl: string;
    serverUrl: string;
    namespace: string;
}): Promise<void> {
    // 32 random bytes = an Ed25519 seed. Web Crypto's CSPRNG, same keyspace
    // the MCP bridge uses (@noble/ed25519 randomPrivateKey).
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
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

    const url = new URL("/connect/app", opts.dashboardUrl);
    url.search = new URLSearchParams({
        publicKey,
        delegateAddress,
        label: CONNECT_LABEL,
        relayer: opts.serverUrl,
        // `connectState`, not `state` — `state` is a reserved OAuth response
        // param and breaks the dashboard's Google sign-in redirect (WALM-86).
        connectState: state,
        redirect: window.location.origin + window.location.pathname,
    }).toString();
    window.location.assign(url.toString());
}

/**
 * If the current URL carries a dashboard callback fragment that matches the
 * pending connect in sessionStorage, consume both and return ready-to-save
 * settings. Returns null when there is no (valid) callback.
 *
 * Module-level memo makes this idempotent — React StrictMode runs state
 * initializers twice, and the second run must see the same result even
 * though the fragment and the pending entry were consumed by the first.
 */
let consumed: InspectorSettings | null | undefined;

export function consumeDashboardCallback(): InspectorSettings | null {
    if (consumed === undefined) consumed = doConsume();
    return consumed;
}

function doConsume(): InspectorSettings | null {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return null;
    const frag = new URLSearchParams(hash);
    const accountId = frag.get("accountId") ?? "";
    const state = frag.get("state") ?? "";
    if (!/^0x[0-9a-fA-F]{64}$/.test(accountId) || !state) return null;

    const rawPending = sessionStorage.getItem(PENDING_KEY);
    if (!rawPending) return null;

    // From here on this IS our callback — consume it even if validation
    // fails, so a mangled fragment can't be replayed.
    sessionStorage.removeItem(PENDING_KEY);
    history.replaceState(null, "", window.location.pathname + window.location.search);

    let pending: PendingConnect;
    try {
        pending = JSON.parse(rawPending) as PendingConnect;
    } catch {
        return null;
    }
    if (state !== pending.state) return null;

    // Accept only the networks the inspector enumerates on; an unrecognised
    // value (e.g. a dashboard on devnet/localnet) would otherwise silently
    // resolve to the mainnet endpoints and show an empty, wrong-network palace.
    const reported = frag.get("network");
    const network: SuiNetwork | null =
        reported === "mainnet" || reported === "testnet" ? reported : null;
    if (!network) return null;
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
