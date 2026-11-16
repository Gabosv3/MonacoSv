import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('@supabase')) return 'vendor-supabase'
          // el visor 3D (se carga aparte): three en su propio archivo, para que un cambio
          // en el código del visor no obligue a volver a descargar los ~900 kB de la librería
          if (id.includes('/three/') || id.includes('@react-three')) return 'vendor-three'
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
