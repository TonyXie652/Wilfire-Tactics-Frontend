import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backboardApiKey =
    env.BACKBOARD_API_KEY || env.VITE_BACKBOARD_API_KEY || "";
  const backboardTarget =
    env.BACKBOARD_BASE_URL || env.VITE_BACKBOARD_BASE_URL || "https://app.backboard.io/api";

  const backboardProxy: Record<string, any> | undefined = backboardApiKey
    ? {
        "/api/backboard": {
          target: backboardTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/backboard/, ""),
          configure: (proxy: any) => {
            proxy.on("proxyReq", (proxyReq: { setHeader: (name: string, value: string) => void }) => {
              proxyReq.setHeader("X-API-Key", backboardApiKey);
            });
          },
        },
      }
    : undefined;

  return {
    plugins: react(),
    server: {
      proxy: backboardProxy,
    },
    preview: {
      proxy: backboardProxy,
    },
  };
});
