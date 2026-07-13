import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Absolute origin baked into og:image / twitter:image (scrapers cannot resolve
// relative URLs). Resolution order:
//   1. VITE_APP_ORIGIN         - explicit override, any host
//   2. VERCEL_PROJECT_PRODUCTION_URL - the project's production domain; Vercel
//      updates this automatically when a custom domain is attached, so each
//      project (testnet, mainnet) bakes its own domain with zero config changes
//   3. VERCEL_URL              - the unique per-deployment URL (previews)
//   4. empty                   - relative fallback for local dev
const appOrigin =
  process.env.VITE_APP_ORIGIN ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
process.env.VITE_APP_ORIGIN = appOrigin

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
