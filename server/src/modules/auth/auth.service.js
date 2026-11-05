import bcrypt from 'bcryptjs';
import { esPrueba } from '../../config/env.js';
import { conflicto, noAutenticado, noEncontrado } from '../../utils/errores.js';
import * as usuarios from './usuarios.repository.js';

// Costo del hash: 10 en uso normal; 4 en pruebas para que la suite sea rápida.
const COSTO_HASH = esPrueba ? 4 : 10;
// Hash ficticio para comparar cuando el correo no existe y así no revelar
// por el tiempo de respuesta si una cuenta está registrada.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia-1', COSTO_HASH);

/** RF-01 · HU-01: registra un usuario con contraseña cifrada. */
export async function registrar({ nombre, correo, contrasena }) {
  const existente = await usuarios.buscarPorCorreo(correo);
  if (existente) throw conflicto('Ya existe una cuenta registrada con ese correo.', { campos: { correo: 'Este correo ya está registrado.' } });
  const contrasenaHash = await bcrypt.hash(contrasena, COSTO_HASH);
  try {
    return await usuarios.crearUsuario({ nombre, correo, contrasenaHash });
  } catch (error) {
    // Dos registros simultáneos con el mismo correo.
    if (error.code === '23505') throw conflicto('Ya existe una cuenta registrada con ese correo.');
    throw error;
  }
}

/** RF-02 · HU-01: valida credenciales. Mensaje genérico para no revelar qué dato falló. */
export async function iniciarSesion({ correo, contrasena }) {
  const usuario = await usuarios.buscarPorCorreoConHash(correo);
  const valido = await bcrypt.compare(contrasena, usuario?.contrasenaHash ?? HASH_FICTICIO);
  if (!usuario || !valido) throw noAutenticado('Correo o contraseña incorrectos.');
  const { contrasenaHash: _omitido, ...publico } = usuario;
  return publico;
}

export async function obtenerPerfil(id) {
  const usuario = await usuarios.buscarPorId(id);
  if (!usuario) throw noEncontrado('La cuenta ya no existe.');
  return usuario;
}
