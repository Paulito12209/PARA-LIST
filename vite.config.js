import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : (command === 'build' ? '/projects/paralist/' : '/'),
  build: {
    rolldownOptions: {
      output: {
        // Bibliotheken (react, lucide-react, …) in einen eigenen Vendor-Chunk
        // splitten: hält beide Chunks unter der 500-kB-Warngrenze und der
        // Vendor-Chunk bleibt über App-Deployments hinweg browser-gecacht.
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules/ }],
        },
      },
    },
  },
}))
