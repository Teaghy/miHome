import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      ignored: [
        '**/src-tauri/**',
        '**/.tools/**',
        '**/.reference/**',
        '**/carrot-kitchen/**',
        '**/*.tmpdir/**',
      ],
    },
  },
  optimizeDeps: { entries: ['index.html'] },
  build: { target: 'es2022' },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
});
