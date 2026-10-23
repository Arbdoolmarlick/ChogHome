import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chogApiPlugin } from './server/vitePlugin.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), chogApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
  },
});
