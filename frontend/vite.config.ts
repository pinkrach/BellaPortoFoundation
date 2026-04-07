import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
    'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(
      env.REACT_APP_SUPABASE_URL ?? '',
    ),
    'process.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(
      env.REACT_APP_SUPABASE_ANON_KEY ?? '',
    ),
    },
    plugins: [react()],
    server: {
    port: 8080,
    strictPort: false,
    },
    resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    },
  }
})
