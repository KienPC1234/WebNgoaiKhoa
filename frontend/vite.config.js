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
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return null

            if (
              id.includes('react-markdown') ||
              id.includes('remark-math') ||
              id.includes('rehype-katex') ||
              id.includes('/katex/')
            ) {
              return 'markdown-math'
            }

            if (id.includes('/pdfjs-dist/')) return 'pdfjs'
            if (id.includes('/framer-motion/')) return 'motion'
            if (id.includes('/@ckeditor/')) return 'ckeditor'
            if (id.includes('/recharts/')) return 'charts'
            if (id.includes('/firebase/')) return 'firebase'
            if (id.includes('/aos/')) return 'aos'

            return null
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Force all imports of react / react-dom to resolve to the
        // single copy installed at the project root. This prevents
        // duplicate React instances when dependencies ship their
        // own builds or when ESM/CJS interop creates separate copies.
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
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
