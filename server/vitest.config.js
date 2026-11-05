import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Carga ../.env si existe (en CI las variables llegan del entorno).
const archivoEnv = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);
process.env.NODE_ENV = 'test';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/helpers/globalSetup.js'],
    // Los archivos de integración comparten la base de datos de pruebas: se ejecutan en serie.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/db/seed-demo.js'],
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: 'tests/reports/cobertura',
    },
  },
});
