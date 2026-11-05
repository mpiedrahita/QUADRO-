import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const dominio = fileURLToPath(new URL('../server/src/domain', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // El frontend reutiliza la misma lógica de reparto del backend para la vista previa,
    // así ambos aplican la misma regla de redondeo (RNF-03). El backend sigue siendo quien valida.
    alias: { '@dominio': dominio },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    // En desarrollo, las llamadas a /api se envían a la API (mismo origen para la cookie de sesión).
    proxy: { '/api': 'http://localhost:4000' },
  },
  build: { outDir: 'dist', sourcemap: false },
});
