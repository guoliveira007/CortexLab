import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    mainFields: ['main', 'module', 'browser'],
  },
  optimizeDeps: {
    include: ['react-window', 'react-virtualized-auto-sizer'],
  },
  build: {
    sourcemap: 'hidden',
    commonjsOptions: {
      include: [/react-window/, /react-virtualized-auto-sizer/, /node_modules/],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    restoreMocks: true,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['src/hooks/useGoogleDrive.js', 'src/hooks/useAutoBackup.js', 'src/components/BackupRestaurar.jsx'],
    },
  },
})
