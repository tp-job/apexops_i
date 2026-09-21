import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Serves `/apexops.json`, the file the browser extension reads to find this
 * app's API (extension spec X11).
 *
 * The extension is given a *web app* URL — `http://localhost:5173/p/my-app` —
 * and the API lives somewhere else (`VITE_API_URL`, chosen at build time), so a
 * page URL alone cannot say where to log in. This file does. Generated rather
 * than checked in because the value is per deploy: a static copy would be right
 * for exactly one of them. In dev it is a middleware, so the file is there
 * without a build; in a build it is emitted next to index.html.
 *
 * Public by design: it carries only the API base URL, which every page of the
 * app already sends to every visitor's browser.
 */
function apexopsDiscovery(apiUrl: string): Plugin {
  const body = JSON.stringify({ app: 'apexops', v: 1, apiUrl }, null, 2) + '\n'
  return {
    name: 'apexops-discovery',
    configureServer(server) {
      server.middlewares.use('/apexops.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(body)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'apexops.json', source: body })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  // Same fallback as `main.tsx`, so the file never disagrees with the app.
  const apiUrl = (env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return {
    plugins: [react(), tailwindcss(), apexopsDiscovery(apiUrl)],
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
  }
})
