/**
 * Configuración de las pruebas E2E (Playwright).
 * Usa el Chrome instalado en el equipo (CHROME_PATH) o el canal "chrome".
 * Proyectos: escritorio (1366×860) y celular (390×844) para verificar RNF-07.
 */
import { defineConfig, devices } from '@playwright/test';

const navegador = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
const puerto = process.env.E2E_PORT ?? '4100';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/output/artefactos',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'e2e/output/junit-e2e.xml' }],
    ['json', { outputFile: 'e2e/output/resultados-e2e.json' }],
    ['html', { outputFolder: 'e2e/output/reporte-html', open: 'never' }],
  ],
  use: {
    baseURL: `http://localhost:${puerto}`,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { ...navegador, args: ['--lang=es-419'], env: { ...process.env, LANGUAGE: 'es_419', LANG: 'es_CO.UTF-8' } },
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } }, grepInvert: /@celular/ },
    // Se ejecuta después de escritorio porque reutiliza las cuentas y el grupo creados en el flujo principal.
    { name: 'celular', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, grep: /@celular/, dependencies: ['escritorio'] },
  ],
  webServer: {
    command: 'node e2e/servidor-e2e.mjs',
    url: `http://localhost:${puerto}/api/salud`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
  },
});
