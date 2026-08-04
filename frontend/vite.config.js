import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({ plugins: [react()], base: '/app/', build: { outDir: path.resolve(import.meta.dirname, '../backend/public/app'), emptyOutDir: true }, server: { proxy: { '/api': 'http://localhost:5001', '/assets': 'http://localhost:5001', '/notifications': 'http://localhost:5001' } } });
