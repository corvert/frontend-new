import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const target = env.VITE_API_URL || "http://localhost:8080";

  return {
    plugins: [tailwindcss(), react()],
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
        },
        "/oauth2": {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
