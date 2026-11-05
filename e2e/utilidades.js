/** Utilidades compartidas por las pruebas E2E. */
import { expect } from '@playwright/test';

export const CLAVE = 'clave1234';
export const CUENTAS = {
  ana: { nombre: 'Ana Torres', correo: 'ana@e2e.quadro.co' },
  bruno: { nombre: 'Bruno Díaz', correo: 'bruno@e2e.quadro.co' },
  carla: { nombre: 'Carla Gómez', correo: 'carla@e2e.quadro.co' },
  diego: { nombre: 'Diego Ruiz', correo: 'diego@e2e.quadro.co' },
};

/**
 * Guarda una captura real de la pantalla para el manual de usuario
 * (solo cuando se ejecuta con CAPTURAS=1).
 */
export async function captura(page, nombre, { conAvisos = false, ...opciones } = {}) {
  if (!process.env.CAPTURAS) return;
  // Espera a que se cierren los avisos anteriores para que no tapen la pantalla.
  if (!conAvisos) await expect(page.locator('.aviso')).toHaveCount(0, { timeout: 6000 });
  await page.waitForTimeout(450); // deja terminar la animación de la balanza
  await page.screenshot({ path: `docs/manual/capturas/${nombre}.png`, ...opciones });
}

export async function iniciarSesion(page, cuenta) {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico').fill(cuenta.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(CLAVE);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/grupos$/);
}

/** Registra una cuenta directamente por la API (para preparar datos sin repetir la UI). */
export async function registrarPorApi(request, cuenta) {
  const res = await request.post('/api/auth/registro', { data: { ...cuenta, contrasena: CLAVE } });
  expect(res.status(), await res.text()).toBe(201);
}
