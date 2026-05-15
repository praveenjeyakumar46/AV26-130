import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        timeout: 300000, // 5 minutes — LLM streaming responses take time
        proxyTimeout: 300000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  success: false, 
                  error: 'Backend service unavailable' 
                }));
              }
            }
          });
          // Keep SSE connections alive
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Connection', 'keep-alive');
          });
        },
      },

      // ── Auth routes (/auth/login, /auth/signup, /auth/me, /auth/verify)
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: 'Auth service unavailable' 
              }));
            }
          });
        },
      },

      "/extract-keywords": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },

      "/health": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: false,
        timeout: 2000,
        configure: (proxy, _options) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              });
              res.end(JSON.stringify({ 
                success: false, 
                status: 'unavailable', 
                message: 'Backend service unavailable' 
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setTimeout(2000);
          });
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          });
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
