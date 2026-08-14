# apps/inspector — Walrus Memory Palace

Sample web app for the Walrus Memory SDK. TypeScript + React 19 + Vite;
pnpm only. No test suite — verify changes by running the app.

## Commands (from the repo root)

- `pnpm build:sdk` — build the SDK first; the app imports the workspace build
- `pnpm --filter @memwal/inspector dev` — dev server on http://localhost:5183
- `pnpm --filter @memwal/inspector build` — type-check + production build

## Architecture

- `src/palace/scenes.ts` — the scene graph: rooms, doorway hotspots, and the
  namespace→library-variant hash (FNV-1a over the namespace name)
- `src/palace/PalaceNav.tsx` — first-person navigator: full-viewport scene,
  click hotspots, zoom-dissolve transitions, and a per-room fly-in video
  played on arrival (`arrivalClip()` in App.tsx; clips end on the room's own
  still so the video→poster hand-off is seamless — regenerate arrivals with
  `--end-image <still>`, see `gen-src/gen-arrivals*.sh`)
- `src/App.tsx` — connect/enter phase machine (connecting → ready → inside) +
  scene state + account data (health, chain inventory, recall joins); one
  console component per room
- `src/lib/chain.ts` — on-chain inventory via Sui gRPC (`listOwnedObjects`
  over Walrus `Blob` objects + a single `metadata` dynamic field, a VecMap
  holding the `memwal_*` attributes). Public JSON-RPC is sunset — keep chain
  reads on gRPC
- `src/lib/connect.ts` — one-click connect. zkLogin/wallet/sponsor only exist
  on the dashboard, so the flow hands off: keypair generated in-browser →
  dashboard `/connect/app` opened in a POPUP → dashboard redirects the popup
  back to `?connect_return=1` (main.tsx detects it, broadcasts the result to
  the palace tab over a same-origin BroadcastChannel, and closes). Same-tab
  redirect (no `connect_return`) is the popup-blocked fallback, consumed by
  `consumeDashboardCallback`. CSRF state token round-trip throughout.

## Constraints worth knowing

- Deployed relayers CORS-allow only their own web origins. Dev mode therefore
  talks same-origin and the vite proxy forwards (`vite.config.ts`); a deployed
  build of this app needs its origin added to the relayer's `ALLOWED_ORIGINS`
- The SDK has no "list all memories" API by design — the inventory comes from
  the chain; plaintext only via `recall()` per namespace ("Decrypt room")
- Room stills are generated assets (`gen-src/` has the pipeline); don't edit
  `public/palace/*` by hand
