import { query } from '../../db/pool.js';

const columnas = 'id, nombre, correo, fecha_registro AS "fechaRegistro"';

export async function crearUsuario({ nombre, correo, contrasenaHash }) {
  const { rows } = await query(
    `INSERT INTO usuario (nombre, correo, contrasena_hash) VALUES ($1, $2, $3) RETURNING ${columnas}`,
    [nombre, correo, contrasenaHash]
  );
  return rows[0];
}

export async function buscarPorCorreoConHash(correo) {
  const { rows } = await query(`SELECT ${columnas}, contrasena_hash AS "contrasenaHash" FROM usuario WHERE correo = $1`, [correo]);
  return rows[0] ?? null;
}

export async function buscarPorCorreo(correo) {
  const { rows } = await query(`SELECT ${columnas} FROM usuario WHERE correo = $1`, [correo]);
  return rows[0] ?? null;
}

export async function buscarPorId(id) {
  const { rows } = await query(`SELECT ${columnas} FROM usuario WHERE id = $1`, [id]);
  return rows[0] ?? null;
}
