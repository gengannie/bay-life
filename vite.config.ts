import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor-react';
          }
          if (id.includes('/src/data/worldData')) {
            return 'world-data';
          }
          if (id.includes('/src/store/')) {
            return 'game-store';
          }
          if (id.includes('/src/components/IsometricScene')) {
            return 'iso-scene';
          }
        },
      },
    },
  },
});
