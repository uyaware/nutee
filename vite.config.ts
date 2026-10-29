import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    proxy: {
      "/api/v1": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "mui-vendor": ["@mui/material", "@emotion/react", "@emotion/styled"],
          "data-vendor": ["@tanstack/react-query", "zod"],
        },
      },
    },
  },
});
