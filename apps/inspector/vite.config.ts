import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    // Dev-server relayer proxy — ON by default, targeting the production
    // relayer. Deployed relayers' CORS allowlists carry no localhost entry,
    // so the SDK's direct browser calls would be blocked when running the
    // sample locally; the app therefore talks same-origin in dev and vite
    // forwards. No path rewrite — signed requests sign method+path+body,
    // not host, so signatures stay valid. Override the target with
    // DEV_BACKEND_PROXY_TARGET (Node-side only, not VITE_-prefixed), or set
    // it to an empty string to disable the proxy entirely.
    const proxyTarget =
        env.DEV_BACKEND_PROXY_TARGET !== undefined
            ? env.DEV_BACKEND_PROXY_TARGET
            : "https://relayer.memory.walrus.xyz";
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
