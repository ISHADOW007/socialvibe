import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      '@/components': path.resolve(process.cwd(), './src/components'),
      '@/pages': path.resolve(process.cwd(), './src/pages'),
      '@/hooks': path.resolve(process.cwd(), './src/hooks'),
      '@/services': path.resolve(process.cwd(), './src/services'),
      '@/store': path.resolve(process.cwd(), './src/store'),
      '@/types': path.resolve(process.cwd(), './src/types'),
      '@/utils': path.resolve(process.cwd(), './src/utils'),
      '@/styles': path.resolve(process.cwd(), './src/styles'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to backend during development
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Optimize build for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
          animations: ['framer-motion'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  define: {
    // Define global constants
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})