/**
 * E2E · RNF-07: la interfaz funciona en un celular (390 px de ancho).
 * Se ejecuta en el proyecto "celular" después del flujo principal de escritorio.
 */
import { expect, test } from '@playwright/test';
import { CUENTAS, captura, iniciarSesion } from './utilidades.js';

test('E2E-16 · RNF-07 @celular: menú, saldos y registro de gasto en pantalla de celular', async ({ page }) => {
  await iniciarSesion(page, CUENTAS.ana);
  // En celular el menú lateral se abre con el botón de menú.
  await page.getByRole('button', { name: 'Menú' }).click();
  await expect(page.getByRole('navigation', { name: 'Grupos' })).toBeVisible();
  await captura(page, 'm1-menu');
  await page.getByRole('navigation', { name: 'Grupos' }).getByRole('link', { name: /Arepas La Esquina/ }).click();

  await expect(page.getByText('El grupo te debe')).toBeVisible();
  // Sin desplazamiento horizontal: el contenido cabe en el ancho de la pantalla.
  const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(anchoDocumento).toBeLessThanOrEqual(390);
  await captura(page, 'm2-saldos');

  await page.getByRole('link', { name: 'Registrar gasto' }).click();
  await page.getByLabel('Descripción').fill('Servilletas para la feria');
  await page.getByLabel('Importe').fill('12000');
  await expect(page.locator('.reparto__monto')).toHaveText(['$4.000', '$4.000', '$4.000']);
  await captura(page, 'm3-registrar-gasto', { fullPage: true });
  await page.getByRole('button', { name: 'Registrar gasto' }).click();
  await expect(page.getByText('Gasto registrado')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await captura(page, 'm4-historial');
});
