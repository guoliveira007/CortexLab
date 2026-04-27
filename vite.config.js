import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
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
