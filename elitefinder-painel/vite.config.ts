import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

let createServer: any = null;

try {
  createServer = require("./server").default;
} catch (e) {
  // Server module not available, OK for build
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/proxy/waha': {
        target: 'http://waha.marketsharedigital.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/waha/, '')
      },
      '/api/proxy/n8n': {
        target: 'http://n8n.marketsharedigital.com.br/webhook',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy\/n8n/, '')
      }
    },
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: createServer ? [react(), expressPlugin()] : [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(server) {
      if (!createServer) return;
      const app = createServer();
      server.middlewares.use(app);
    },
  };
}
