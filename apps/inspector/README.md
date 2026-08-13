# Walrus Memory Inspector

A sample dashboard that shows how to build a **memory inspector** with the
Walrus Memory SDK (`@mysten-incubation/memwal`): browse every memory an
account has stored, with its on-chain metadata, and decrypt content through
the relayer.

## What it demonstrates

The SDK has no "list all memories" API on purpose — the relayer only stores
vectors and blob IDs, plaintext lives SEAL-encrypted on Walrus, and **the Sui
chain is the source of truth for what exists**. The inspector embraces that
split:

| Panel | Data source | Calls |
| --- | --- | --- |
| Overview | Relayer + chain | `memwal.health()`, `getObject(accountId)` |
| Memories | Sui chain | `listOwnedObjects` on `walrus::blob::Blob` + `memwal_*` metadata dynamic fields |
| Reveal text | Relayer | `memwal.recall({ limit: 100, namespace })`, joined onto rows by `blob_id` |
| Semantic search | Relayer | `memwal.recall({ query, limit, maxDistance, namespace })` |
| Write & maintain | Relayer | `memwal.remember()` + `waitForRememberJob()`, `memwal.analyze()`, `memwal.restore()` |

Every panel has a collapsible "Show the SDK call" snippet with the exact code
it runs.

## Run it

From the repo root (build the SDK first):

```bash
pnpm install
pnpm build:sdk
pnpm --filter @memwal/inspector dev
```

Then open http://localhost:5183 and click **Connect with Walrus Memory**:

1. The inspector generates an Ed25519 delegate key in your browser.
2. You land on the Walrus Memory dashboard, sign in with Google (zkLogin) or
   a Sui wallet, and click **Approve** — a sponsored transaction registers
   the key on your account (no gas needed).
3. The dashboard sends you back, connected. The private key never left your
   browser; the dashboard only saw its public half.

No keys to copy, no object IDs to hunt down. If you already have credentials
(the same values `MemWal.create()` takes), "Manual setup & advanced options"
accepts a delegate key + account ID directly. Either way everything stays in
your browser's localStorage.

To point the connect flow at a locally running dashboard instead of
production, set `VITE_MEMWAL_DASHBOARD_URL=http://localhost:5173` in
`apps/inspector/.env.local` (see `.env.example`).

## Notes

- **Why some rows stay 🔒 encrypted**: "Reveal text" uses a broad `recall()`
  (top 100 by similarity) because the relayer exposes no get-by-blob-id.
  Rows the search doesn't surface remain encrypted — that's the privacy
  model working, not a bug.
- The on-chain query needs a Sui **gRPC** fullnode endpoint
  (`https://fullnode.<network>.sui.io` by default) — public JSON-RPC is
  being sunset.
- The Walrus package ID (which defines the `Blob` object type) is
  network-dependent; override it in Settings → Advanced if you run against
  a custom deployment.
