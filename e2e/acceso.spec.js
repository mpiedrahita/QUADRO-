/**
 * E2E · HU-01 · RNF-01: protección de rutas e inicio de sesión fallido.
 */
import { expect, test } from '@playwright/test';
import { captura } from './utilidades.js';

test('E2E-14 · RNF-01: sin sesión, una página privada redirige a "Ingresar"', async ({ page }) => {
  await page.goto('/grupos');
  await expect(page).toHaveURL(/\/ingresar$/);
  await expect(page.getByRole('heading', { name: 'Ingresa a Quadro' })).toBeVisible();
});

test('E2E-15 · HU-01: credenciales incorrectas muestran un error y no dan acceso', async ({ page }) => {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico').fill('ana@e2e.quadro.co');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta9');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
  await expect(page).toHaveURL(/\/ingresar$/);
  await captura(page, '00-ingresar-error');
});
