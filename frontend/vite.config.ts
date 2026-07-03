import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_PUBLIC_HOST (optional, set in .env): public domain when the dev
  // server runs behind a TLS reverse proxy (e.g. nginx on the Linode box).
  // Enables that host and routes HMR through wss on 443. Unset locally.
  const publicHost = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "")
    .VITE_PUBLIC_HOST;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      ...(publicHost && {
        allowedHosts: [publicHost],
        hmr: { protocol: "wss", host: publicHost, clientPort: 443 },
      }),
    },
  };
});
