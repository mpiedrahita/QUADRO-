/**
 * Cliente HTTP de la API de Quadro.
 * Envía la cookie de sesión (credentials: 'include') y convierte las respuestas
 * de error del backend en ApiError con mensaje y errores por campo.
 */
export class ApiError extends Error {
  constructor(estado, mensaje, campos = {}, extra = {}) {
    super(mensaje);
    this.estado = estado;
    this.campos = campos;
    this.extra = extra;
  }
}

async function solicitar(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, credentials: 'include', headers: {} };
  if (cuerpo instanceof FormData) {
    opciones.body = cuerpo;
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, opciones);
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const { mensaje = 'Ocurrió un error inesperado.', campos = {}, ...extra } = datos.error ?? {};
    const error = new ApiError(respuesta.status, mensaje, campos, extra);
    if (respuesta.status === 401) window.dispatchEvent(new CustomEvent('quadro:sesion-expirada'));
    throw error;
  }
  return datos;
}

const qs = (filtros = {}) => {
  const p = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '' && v !== false));
  const texto = p.toString();
  return texto ? `?${texto}` : '';
};

export const api = {
  // Acceso (HU-01)
  registro: (datos) => solicitar('POST', '/auth/registro', datos),
  login: (datos) => solicitar('POST', '/auth/login', datos),
  logout: () => solicitar('POST', '/auth/logout'),
  perfil: () => solicitar('GET', '/auth/me'),

  // Grupos (HU-02)
  grupos: () => solicitar('GET', '/grupos'),
  crearGrupo: (datos) => solicitar('POST', '/grupos', datos),
  grupo: (id) => solicitar('GET', `/grupos/${id}`),
  editarGrupo: (id, datos) => solicitar('PATCH', `/grupos/${id}`, datos),

  // Participantes (HU-03)
  participantes: (id, incluirRetirados) => solicitar('GET', `/grupos/${id}/participantes${qs({ incluirRetirados })}`),
  agregarParticipante: (id, correo) => solicitar('POST', `/grupos/${id}/participantes`, { correo }),
  retirarParticipante: (id, participacionId) => solicitar('DELETE', `/grupos/${id}/participantes/${participacionId}`),

  // Categorías (HU-10)
  categorias: (id) => solicitar('GET', `/grupos/${id}/categorias`),
  crearCategoria: (id, nombre) => solicitar('POST', `/grupos/${id}/categorias`, { nombre }),
  renombrarCategoria: (id, categoriaId, nombre) => solicitar('PATCH', `/grupos/${id}/categorias/${categoriaId}`, { nombre }),
  eliminarCategoria: (id, categoriaId) => solicitar('DELETE', `/grupos/${id}/categorias/${categoriaId}`),

  // Gastos (HU-04, HU-05, HU-07, HU-09)
  gastos: (id, filtros) => solicitar('GET', `/grupos/${id}/gastos${qs(filtros)}`),
  gasto: (id, gastoId) => solicitar('GET', `/grupos/${id}/gastos/${gastoId}`),
  crearGasto: (id, datos) => solicitar('POST', `/grupos/${id}/gastos`, datos),
  editarGasto: (id, gastoId, datos) => solicitar('PUT', `/grupos/${id}/gastos/${gastoId}`, datos),
  anularGasto: (id, gastoId) => solicitar('PATCH', `/grupos/${id}/gastos/${gastoId}/anular`),

  // Comprobantes (HU-08)
  comprobantes: (id, gastoId) => solicitar('GET', `/grupos/${id}/gastos/${gastoId}/comprobantes`),
  adjuntarComprobante: (id, gastoId, archivo) => {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return solicitar('POST', `/grupos/${id}/gastos/${gastoId}/comprobantes`, datos);
  },
  urlComprobante: (id, gastoId, comprobanteId) => `/api/grupos/${id}/gastos/${gastoId}/comprobantes/${comprobanteId}/archivo`,
  eliminarComprobante: (id, gastoId, comprobanteId) => solicitar('DELETE', `/grupos/${id}/gastos/${gastoId}/comprobantes/${comprobanteId}`),

  // Saldos y liquidaciones (HU-06, HU-13)
  saldos: (id) => solicitar('GET', `/grupos/${id}/saldos`),
  liquidaciones: (id) => solicitar('GET', `/grupos/${id}/liquidaciones`),
  crearLiquidacion: (id, datos) => solicitar('POST', `/grupos/${id}/liquidaciones`, datos),
  anularLiquidacion: (id, liquidacionId) => solicitar('PATCH', `/grupos/${id}/liquidaciones/${liquidacionId}/anular`),
};
