import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
