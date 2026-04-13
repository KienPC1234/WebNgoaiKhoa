import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const allowedHosts = env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(',') : []

  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: allowedHosts,
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
        },
        '/ws': {
          target: 'http://localhost:3002',
          ws: true,
          changeOrigin: true,
        }
      }
    },
  }
})
