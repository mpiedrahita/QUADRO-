/**
 * Utilidades para las pruebas de integración: crean usuarios, grupos y gastos
 * a través de la API real (Express + PostgreSQL de pruebas).
 */
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { crearApp } from '../../src/app.js';
import { hoyISO } from '../../src/utils/fechas.js';

export const app = crearApp();
export const hoy = () => hoyISO();

/** Correo único por ejecución para que las pruebas no dependan unas de otras. */
export const correoUnico = (nombre) => `${nombre.toLowerCase()}.${randomUUID().slice(0, 8)}@prueba.quadro`;

/** Registra un usuario y devuelve un "agente" que conserva la cookie de sesión. */
export async function nuevoUsuario(nombre = 'Usuario') {
  const agente = request.agent(app);
  const correo = correoUnico(nombre);
  const res = await agente.post('/api/auth/registro').send({ nombre, correo, contrasena: 'clave1234' });
  if (res.status !== 201) throw new Error(`No se pudo registrar ${nombre}: ${JSON.stringify(res.body)}`);
  return { agente, usuario: res.body.usuario, correo };
}

/**
 * Escenario base del plan de pruebas del Entregable 2:
 * grupo ficticio con Ana (administradora), Bruno y Carla.
 */
export async function escenarioBase(nombreGrupo = 'Arepas La Esquina') {
  const ana = await nuevoUsuario('Ana');
  const bruno = await nuevoUsuario('Bruno');
  const carla = await nuevoUsuario('Carla');
  const { body } = await ana.agente.post('/api/grupos').send({ nombre: nombreGrupo });
  const grupo = body.grupo;
  const base = `/api/grupos/${grupo.id}`;
  for (const persona of [bruno, carla]) {
    const r = await ana.agente.post(`${base}/participantes`).send({ correo: persona.correo });
    if (r.status !== 201) throw new Error(`No se pudo agregar participante: ${JSON.stringify(r.body)}`);
    persona.participacionId = r.body.participante.id;
  }
  ana.participacionId = grupo.miParticipacionId;
  const { body: cats } = await ana.agente.get(`${base}/categorias`);
  const categoria = (nombre) => cats.categorias.find((c) => c.nombre === nombre).id;
  return { ana, bruno, carla, grupo, base, categoria };
}

/** Registra un gasto con valores por defecto razonables. */
export function registrarGasto(agente, base, datos) {
  return agente.post(`${base}/gastos`).send({ fecha: hoy(), descripcion: 'Gasto de prueba', ...datos });
}
