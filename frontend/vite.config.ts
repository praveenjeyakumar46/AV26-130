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
      "/extract-keywords": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: false, // Disable WebSocket for health endpoint
        timeout: 2000, // 2 second timeout
        configure: (proxy, _options) => {
          // Suppress all proxy errors - backend may not be running
          proxy.on('error', (err, _req, res) => {
            // Silently handle all connection errors
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
            // Don't log the error - it's expected when backend is not running
          });
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Set timeout to prevent hanging
            proxyReq.setTimeout(2000);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Add CORS headers to successful responses
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
