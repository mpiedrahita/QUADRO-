/**
 * Datos de demostración para la sustentación y el manual de usuario.
 * Crea tres cuentas ficticias, un grupo con gastos repartidos por los tres métodos
 * y una liquidación. Usa los servicios reales, así que pasa por las mismas validaciones.
 *
 * Uso: npm run db:seed   (no borra datos existentes; si las cuentas ya existen, se detiene)
 * Contraseña de las tres cuentas: Quadro2026
 */
import { fileURLToPath } from 'node:url';
import { migrar } from './migrate.js';
import { pool } from './pool.js';
import { hoyISO } from '../utils/fechas.js';
import * as auth from '../modules/auth/auth.service.js';
import * as grupos from '../modules/grupos/grupos.service.js';
import * as participantes from '../modules/participantes/participantes.service.js';
import * as gastos from '../modules/gastos/gastos.service.js';
import * as liquidaciones from '../modules/liquidaciones/liquidaciones.service.js';
import { listarCategorias } from '../modules/categorias/categorias.repository.js';
import { buscarPorCorreo } from '../modules/auth/usuarios.repository.js';

export const CONTRASENA_DEMO = 'Quadro2026';
export const CUENTAS_DEMO = [
  { nombre: 'Ana Torres', correo: 'ana@demo.quadro.co' },
  { nombre: 'Bruno Díaz', correo: 'bruno@demo.quadro.co' },
  { nombre: 'Carla Gómez', correo: 'carla@demo.quadro.co' },
];

/** Fecha AAAA-MM-DD de hace n días. */
function haceDias(n) {
  const [a, m, d] = hoyISO().split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d - n)).toISOString().slice(0, 10);
}

export async function sembrarDemo() {
  if (await buscarPorCorreo(CUENTAS_DEMO[0].correo)) {
    console.log('[demo] Las cuentas de demostración ya existen. No se hicieron cambios.');
    return null;
  }
  const usuarios = [];
  for (const cuenta of CUENTAS_DEMO) usuarios.push(await auth.registrar({ ...cuenta, contrasena: CONTRASENA_DEMO }));

  const grupo = await grupos.crearGrupo(usuarios[0].id, {
    nombre: 'Arepas La Esquina',
    descripcion: 'Emprendimiento de arepas rellenas para ferias y pedidos a domicilio.',
  });
  const membresiaAna = { participacionId: grupo.miParticipacionId, rol: 'ADMINISTRADOR' };
  const pB = await participantes.agregar(grupo.id, CUENTAS_DEMO[1].correo);
  const pC = await participantes.agregar(grupo.id, CUENTAS_DEMO[2].correo);
  const membresiaBruno = { participacionId: pB.id, rol: 'INTEGRANTE' };
  const membresiaCarla = { participacionId: pC.id, rol: 'INTEGRANTE' };
  const pA = grupo.miParticipacionId;

  const cat = Object.fromEntries((await listarCategorias(grupo.id)).map((c) => [c.nombre, c.id]));
  const todos = [{ participacionId: pA }, { participacionId: pB.id }, { participacionId: pC.id }];

  await gastos.crear(grupo.id, membresiaAna, {
    descripcion: 'Harina de maíz y queso para la feria',
    importe: 90000,
    fecha: haceDias(12),
    categoriaId: cat['Materia prima'],
    pagadorId: pA,
    metodo: 'IGUAL',
    repartos: todos,
  });
  await gastos.crear(grupo.id, membresiaBruno, {
    descripcion: 'Plancha eléctrica para asar',
    importe: 200000,
    fecha: haceDias(9),
    categoriaId: cat['Herramientas'],
    pagadorId: pB.id,
    metodo: 'PORCENTAJE',
    repartos: [
      { participacionId: pA, porcentaje: 50 },
      { participacionId: pB.id, porcentaje: 30 },
      { participacionId: pC.id, porcentaje: 20 },
    ],
  });
  await gastos.crear(grupo.id, membresiaCarla, {
    descripcion: 'Transporte de la carpa al parque',
    importe: 45000,
    fecha: haceDias(6),
    categoriaId: cat['Transporte'],
    pagadorId: pC.id,
    metodo: 'VALOR',
    repartos: [
      { participacionId: pA, valor: 15000 },
      { participacionId: pC.id, valor: 30000 },
    ],
  });
  await gastos.crear(grupo.id, membresiaAna, {
    descripcion: 'Bolsas, servilletas y empaques',
    importe: 100000,
    fecha: haceDias(3),
    categoriaId: cat['Insumos'],
    pagadorId: pA,
    metodo: 'IGUAL',
    repartos: todos,
  });
  await liquidaciones.crear(grupo.id, membresiaCarla, {
    emisorId: pC.id,
    receptorId: pA,
    importe: 30000,
    fecha: haceDias(1),
    nota: 'Transferencia por Nequi',
  });
  console.log(`[demo] Grupo "Arepas La Esquina" creado con 4 gastos y 1 liquidación.`);
  console.log(`[demo] Cuentas: ${CUENTAS_DEMO.map((c) => c.correo).join(', ')} · contraseña: ${CONTRASENA_DEMO}`);
  return grupo;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrar({ silencioso: true })
    .then(sembrarDemo)
    .then(() => pool.end())
    .catch((error) => {
      console.error('[demo] Error:', error.message);
      process.exit(1);
    });
}
