import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Honour PORT when the environment assigns one (tooling, containers, multiple
  // concurrent dev servers); fall back to Vite's usual 5173 when it doesn't.
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
