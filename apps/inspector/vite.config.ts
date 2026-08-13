import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    // Opt-in dev-server proxy, same mechanism as apps/app: the deployed
    // relayers' CORS allowlists carry no localhost entry, so the SDK's direct
    // browser calls are blocked when running the inspector locally. Set
    // DEV_BACKEND_PROXY_TARGET (Node-side only, not VITE_-prefixed) to a
    // relayer origin and VITE_MEMWAL_SERVER_URL=http://localhost:5183 so the
    // SDK talks same-origin and vite forwards. No path rewrite — signed
    // requests sign method+path+body, not host, so signatures stay valid.
    const proxyTarget = env.DEV_BACKEND_PROXY_TARGET;
    const proxyConfig = { changeOrigin: true, secure: true };
    const proxy = proxyTarget
        ? {
              "/api": { target: proxyTarget, ...proxyConfig },
              "/health": { target: proxyTarget, ...proxyConfig },
              "/version": { target: proxyTarget, ...proxyConfig },
              "/config": { target: proxyTarget, ...proxyConfig },
          }
        : undefined;

    return {
        plugins: [react()],
        server: { port: 5183, proxy },
    };
});
