import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'ws://localhost:8000',
        ws: true,
      }
    }
  },
  build: {
    // Raise the warning threshold slightly; we split the rest manually
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — almost never changes; long-lived browser cache
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State management
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
          // Icon + notification libraries (large, static)
          'vendor-ui': ['react-icons', 'notistack'],
          // Socket.IO client — only needed after login
          'vendor-socket': ['socket.io-client'],
        }
      }
    }
  }
})
