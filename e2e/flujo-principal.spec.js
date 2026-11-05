/**
 * Pruebas E2E del flujo principal del MVP en el navegador (interfaz + API + PostgreSQL).
 * Cada prueba indica la historia de usuario y los requisitos que verifica.
 * Se ejecutan en orden porque cada paso usa lo que creó el anterior (como en la demostración).
 */
import { expect, test } from '@playwright/test';
import { CLAVE, CUENTAS, captura, iniciarSesion, registrarPorApi } from './utilidades.js';

test.describe.configure({ mode: 'serial' });

let page;
let urlGrupo;

test.beforeAll(async ({ browser, request }) => {
  await registrarPorApi(request, CUENTAS.bruno);
  await registrarPorApi(request, CUENTAS.carla);
  await registrarPorApi(request, CUENTAS.diego);
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page?.close();
});

const balanza = () => page.getByRole('table', { name: 'Saldo de cada integrante' });
const filaBalanza = (nombre) => balanza().getByRole('row').filter({ hasText: nombre });

test('E2E-01 · HU-01: el registro valida los campos y crea la cuenta', async () => {
  await page.goto('/registro');
  await captura(page, '01-registro');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('El nombre debe tener al menos 2 caracteres.')).toBeVisible();
  await expect(page.getByText('El correo es obligatorio.')).toBeVisible();
  await expect(page.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeVisible();
  await captura(page, '02-registro-errores');

  await page.getByLabel('Nombre').fill(CUENTAS.ana.nombre);
  await page.getByLabel('Correo electrónico').fill(CUENTAS.ana.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(CLAVE);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/grupos$/);
  await expect(page.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
  await expect(page.getByText('Crea tu primer grupo')).toBeVisible();
  await captura(page, '03-mis-grupos-vacio');
});

test('E2E-02 · HU-02: crear un grupo exige nombre y deja al creador como administrador', async () => {
  await page.getByRole('main').getByRole('button', { name: 'Crear grupo' }).first().click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('button', { name: 'Crear grupo' }).click();
  await expect(dialogo.getByText('El nombre del grupo debe tener al menos 3 caracteres.')).toBeVisible();

  await dialogo.getByLabel('Nombre del grupo o emprendimiento').fill('Arepas La Esquina');
  await dialogo.getByLabel('Descripción').fill('Emprendimiento de arepas rellenas para ferias y domicilios.');
  await captura(page, '04-crear-grupo');
  await dialogo.getByRole('button', { name: 'Crear grupo' }).click();

  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]+\/integrantes$/);
  urlGrupo = page.url().replace(/\/integrantes$/, '');
  await expect(page.getByRole('heading', { name: 'Arepas La Esquina' })).toBeVisible();
  await expect(page.getByText('Tu rol: administrador.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Grupos' }).getByText('Arepas La Esquina')).toBeVisible();
});

test('E2E-03 · HU-03: el administrador agrega integrantes por correo', async () => {
  const correo = page.getByLabel('Correo de su cuenta en Quadro');
  await correo.fill('nadie@sin-cuenta.co');
  await page.getByRole('button', { name: 'Agregar integrante' }).click();
  await expect(page.getByText(/Este correo no está registrado en Quadro/)).toBeVisible();

  for (const cuenta of [CUENTAS.bruno, CUENTAS.carla]) {
    await correo.fill(cuenta.correo);
    await page.getByRole('button', { name: 'Agregar integrante' }).click();
    await expect(page.getByText(`${cuenta.nombre} ahora es integrante del grupo`)).toBeVisible();
  }
  await expect(page.getByText('3 integrantes.')).toBeVisible();
  await captura(page, '05-integrantes');
});

test('E2E-04 · HU-04, HU-05: registrar un gasto en partes iguales con vista previa del reparto', async () => {
  await page.getByRole('link', { name: 'Registrar gasto' }).click();
  await page.getByLabel('Descripción').fill('Harina de maíz y queso');
  await page.getByLabel('Importe').fill('90000');
  await page.getByLabel('Categoría').selectOption({ label: 'Materia prima' });
  await expect(page.getByText('El reparto suma $90.000.')).toBeVisible();
  await expect(page.locator('.reparto__monto')).toHaveText(['$30.000', '$30.000', '$30.000']);
  await captura(page, '06-registrar-gasto', { fullPage: true });
  await page.getByRole('button', { name: 'Registrar gasto' }).click();
  await expect(page.getByText('Gasto registrado')).toBeVisible();
  await expect(page).toHaveURL(/\/gastos$/);
  await expect(page.getByText('Harina de maíz y queso')).toBeVisible();
});

test('E2E-05 · HU-05, RNF-03: porcentajes que no suman 100 % se rechazan; corregidos se guardan', async () => {
  await page.getByRole('link', { name: 'Registrar gasto' }).click();
  await page.getByLabel('Descripción').fill('Plancha eléctrica para asar');
  await page.getByLabel('Importe').fill('200000');
  await page.getByLabel('Categoría').selectOption({ label: 'Herramientas' });
  await page.getByRole('radio', { name: 'Porcentajes' }).check();
  await page.getByLabel('Porcentaje de Ana Torres').fill('50');
  await page.getByLabel('Porcentaje de Bruno Díaz').fill('30');
  await page.getByLabel('Porcentaje de Carla Gómez').fill('10');
  await expect(page.locator('.reparto__resumen')).toContainText('Los porcentajes deben sumar 100 %. Actualmente suman 90 %.');

  // El servidor también lo rechaza si se intenta guardar.
  await page.getByRole('button', { name: 'Registrar gasto' }).click();
  await expect(page.getByText('No se guardó el gasto. Revisa los campos marcados.')).toBeVisible();
  await captura(page, '07-reparto-porcentajes-error', { fullPage: true });

  await page.getByLabel('Porcentaje de Carla Gómez').fill('20');
  await expect(page.locator('.reparto__monto')).toHaveText(['$100.000', '$60.000', '$40.000']);
  await captura(page, '08-reparto-porcentajes', { fullPage: true });
  await page.getByRole('button', { name: 'Registrar gasto' }).click();
  await expect(page.getByText('Gasto registrado')).toBeVisible();
  await expect(page.locator('.gasto')).toHaveCount(2);
  await captura(page, '09-historial-gastos');
});

test('E2E-06 · HU-06, RF-08: los saldos muestran aportes, obligaciones y deudas', async () => {
  await page.getByRole('link', { name: 'Saldos' }).click();
  await expect(filaBalanza('Ana Torres')).toContainText('+$160.000');
  await expect(filaBalanza('Bruno Díaz')).toContainText('−$90.000');
  await expect(filaBalanza('Carla Gómez')).toContainText('−$70.000');
  await expect(page.getByText('El grupo te debe')).toBeVisible();
  await expect(page.locator('.deuda')).toHaveCount(2);
  await captura(page, '10-saldos', { fullPage: true });
});

test('E2E-07 · HU-08, RNF-09: adjuntar un comprobante a un gasto', async () => {
  await page.getByRole('link', { name: 'Gastos', exact: true }).click();
  await page.getByText('Plancha eléctrica para asar').click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByText('Este gasto no tiene comprobantes.')).toBeVisible();
  await page.setInputFiles('#archivo-comprobante', 'e2e/fixtures/comprobante-prueba.png');
  await expect(page.getByText('Comprobante adjuntado')).toBeVisible();
  await expect(dialogo.getByRole('link', { name: 'comprobante-prueba.png' })).toBeVisible();
  await captura(page, '11-detalle-gasto');
  await dialogo.getByRole('button', { name: 'Cerrar' }).click();
});

test('E2E-08 · HU-07, RF-12: el historial se filtra por categoría y participante', async () => {
  await page.getByLabel('Categoría').selectOption({ label: 'Herramientas' });
  await expect(page.locator('.gasto')).toHaveCount(1);
  await expect(page.locator('.gasto').first()).toContainText('Plancha eléctrica para asar');
  await captura(page, '12-filtros');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.locator('.gasto')).toHaveCount(2);
});

test('E2E-09 · HU-09, RF-10: editar un gasto lo marca como modificado y recalcula los saldos', async () => {
  await page.getByText('Harina de maíz y queso').click();
  await page.getByRole('dialog').getByRole('link', { name: 'Editar gasto' }).click();
  await expect(page.getByRole('heading', { name: 'Editar gasto' })).toBeVisible();
  await page.getByLabel('Importe').fill('120000');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados. Los saldos se recalcularon.')).toBeVisible();
  await expect(page.locator('.gasto').filter({ hasText: 'Harina de maíz y queso' })).toContainText('Modificado');

  await page.getByRole('link', { name: 'Saldos' }).click();
  await expect(filaBalanza('Ana Torres')).toContainText('+$180.000');
  await expect(filaBalanza('Bruno Díaz')).toContainText('−$100.000');
});

test('E2E-10 · HU-09: anular un gasto pide confirmación y lo excluye de los saldos', async () => {
  await page.getByRole('link', { name: 'Registrar gasto' }).click();
  await page.getByLabel('Descripción').fill('Gasto duplicado por error');
  await page.getByLabel('Importe').fill('15000');
  await page.getByRole('button', { name: 'Registrar gasto' }).click();
  await expect(page.getByText('Gasto registrado')).toBeVisible();

  await page.getByText('Gasto duplicado por error').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Anular gasto' }).click();
  await expect(page.getByRole('heading', { name: '¿Anular este gasto?' })).toBeVisible();
  await captura(page, '13-confirmar-anulacion');
  await page.getByRole('dialog').getByRole('button', { name: 'Anular gasto' }).click();
  await expect(page.getByText('Gasto anulado. Los saldos se actualizaron.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.gasto')).toHaveCount(2);
  await page.getByLabel('Mostrar gastos anulados').check();
  await expect(page.locator('.gasto--anulado')).toContainText('Anulado');

  await page.getByRole('link', { name: 'Saldos' }).click();
  await expect(filaBalanza('Ana Torres')).toContainText('+$180.000');
});

test('E2E-11 · HU-10, RF-11: el administrador crea categorías y no se permiten repetidas', async () => {
  await page.getByRole('link', { name: 'Categorías' }).click();
  await page.getByLabel('Nombre').fill('insumos');
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  await expect(page.getByText('Ese nombre ya está en uso.')).toBeVisible();
  await page.getByLabel('Nombre').fill('Publicidad');
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  await expect(page.getByText('Categoría "Publicidad" creada')).toBeVisible();
  await expect(page.locator('.categoria').filter({ hasText: 'Publicidad' })).toBeVisible();
  await captura(page, '14-categorias');
});

test('E2E-12 · HU-13, RF-19: un integrante registra una liquidación y los saldos se actualizan', async ({ browser }) => {
  const contexto = await browser.newContext();
  const bruno = await contexto.newPage();
  await iniciarSesion(bruno, CUENTAS.bruno);
  await bruno.goto(urlGrupo);
  const deuda = bruno.locator('.deuda').filter({ hasText: 'Le debes a' });
  await expect(deuda).toContainText('Ana Torres');
  await expect(deuda).toContainText('$100.000');
  await deuda.getByRole('link', { name: 'Registrar liquidación' }).click();

  await expect(bruno.getByText('Bruno Díaz le debe $100.000 a Ana Torres.')).toBeVisible();
  await bruno.getByLabel('Importe').fill('200000');
  await bruno.getByRole('button', { name: 'Registrar liquidación' }).click();
  await expect(bruno.getByText('El importe supera la deuda pendiente ($100.000).')).toBeVisible();

  await bruno.getByLabel('Importe').fill('50000');
  await bruno.getByLabel('Nota').fill('Transferencia por Nequi');
  await captura(bruno, '15-liquidacion');
  await bruno.getByRole('button', { name: 'Registrar liquidación' }).click();
  await expect(bruno.getByText('Liquidación registrada: Bruno Díaz pagó $50.000 a Ana Torres')).toBeVisible();
  await expect(bruno.locator('.liquidacion')).toContainText('Bruno Díaz pagó a Ana Torres');
  await captura(bruno, '16-historial-liquidaciones', { conAvisos: true });

  await bruno.getByRole('link', { name: 'Saldos' }).click();
  await expect(bruno.getByText('Le debes al grupo')).toBeVisible();
  await expect(bruno.locator('.posicion__cifra')).toHaveText('$50.000');
  await contexto.close();
});

test('E2E-13 · RNF-04: una persona que no es integrante no puede ver el grupo', async ({ browser }) => {
  const contexto = await browser.newContext();
  const diego = await contexto.newPage();
  await iniciarSesion(diego, CUENTAS.diego);
  await diego.goto(urlGrupo);
  await expect(diego.getByRole('heading', { name: 'No encontramos este grupo' })).toBeVisible();
  await expect(diego.getByText('Arepas La Esquina')).toHaveCount(0);
  await contexto.close();
});
