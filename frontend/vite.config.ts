import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // Keep teammate incoming change: configurable base path.
    base: env.VITE_BASE_PATH || '/',

    // Keep your Supabase env setup: Supabase uses `import.meta.env.VITE_SUPABASE_*`
    // via `src/lib/supabaseClient.ts`. No `process.env` shims needed.
    plugins: [react()],
    server: {
      port: 8080,
      strictPort: false,
    host: true,
    open: true,
  },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
