import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// "npm run build" genera el sitio para Vercel (carpeta dist).
// "npm run build:offline" genera un unico archivo HTML que se abre sin internet (carpeta offline).
export default defineConfig(({ mode }) => {
  const offline = mode === 'offline'
  return {
    plugins: offline ? [react(), viteSingleFile()] : [react()],
    build: offline
      ? { outDir: 'offline', assetsInlineLimit: 100000000, emptyOutDir: true, chunkSizeWarningLimit: 3000 }
      : { outDir: 'dist', chunkSizeWarningLimit: 1200 },
  }
})
