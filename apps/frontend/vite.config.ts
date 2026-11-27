import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export function resolverVersaoApp(): string {
  const envVersao = process.env.VITE_APP_VERSION?.trim()
  if (envVersao) return envVersao
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (tag) return tag.replace(/^.*-(v\d+\.\d+\.\d+.*)$/, '$1')
  } catch {
    // fallback para package.json quando executado fora de um repositório git
  }
  const pkgRaw = fs.readFileSync(path.resolve(import.meta.dirname, './package.json'), 'utf-8')
  const pkg = JSON.parse(pkgRaw) as { version?: string }
  return pkg.version ? `v${pkg.version}` : 'dev'
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(resolverVersaoApp()),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    }
  }
})