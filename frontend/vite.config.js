import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5001',
      '/auth': 'http://localhost:5001',
      '/notifications': 'http://localhost:5001',
      '/assets': 'http://localhost:5001'
    }
  }
});
