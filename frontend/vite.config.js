// Aca se define la configuracion de tailwind
import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Reenvía las peticiones al backend PHP (Apache, puerto 80)
    proxy: {
      '/SistemaControlPracticas/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
    },
  },
})
