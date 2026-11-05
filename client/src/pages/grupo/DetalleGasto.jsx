import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import Dialogo, { DialogoConfirmar } from '../../components/Dialogo.jsx';
import Icono from '../../components/Icono.jsx';
import { Cargando, ErrorCarga } from '../../components/Estados.jsx';
import { METODOS, formatoFecha, formatoPesos } from '../../utils/formato.js';
import { useGrupo } from './Grupo.jsx';

const ESTADOS = { REGISTRADO: 'Registrado', MODIFICADO: 'Modificado', ANULADO: 'Anulado' };
const kb = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** HU-08 · RF-09: comprobantes del gasto (adjuntar, ver y eliminar). */
function Comprobantes({ gasto, alCambiar }) {
  const { grupoId, esAdmin, miParticipacionId } = useGrupo();
  const { datos, recargar } = useCarga(() => api.comprobantes(grupoId, gasto.id), [gasto.id]);
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const entrada = useRef(null);
  const lista = datos?.comprobantes ?? [];

  async function adjuntar(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError('');
    if (archivo.size > 2 * 1024 * 1024) return setError('El archivo supera el tamaño máximo permitido (2 MB).');
    setSubiendo(true);
    try {
      await api.adjuntarComprobante(grupoId, gasto.id, archivo);
      recargar();
      alCambiar('Comprobante adjuntado');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function eliminar(id) {
    setError('');
    try {
      await api.eliminarComprobante(grupoId, gasto.id, id);
      recargar();
      alCambiar('Comprobante eliminado');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="detalle__seccion" aria-labelledby="titulo-comprobantes">
      <h3 id="titulo-comprobantes">Comprobantes</h3>
      {lista.length === 0 ? (
        <p className="texto-suave">Este gasto no tiene comprobantes.</p>
      ) : (
        <ul className="lista comprobantes">
          {lista.map((c) => {
            const puedeEliminar = esAdmin || c.subidoPorId === miParticipacionId || gasto.registradoPorId === miParticipacionId;
            return (
              <li key={c.id}>
                <Icono nombre="recibo" className="icono-mini" />
                <a href={api.urlComprobante(grupoId, gasto.id, c.id)} target="_blank" rel="noreferrer">
                  {c.nombreArchivo}
                </a>
                <span className="texto-suave">
                  {kb(c.tamanoBytes)}, subido por {c.subidoPor}
                </span>
                {puedeEliminar && (
                  <button
                    type="button"
                    className="boton boton--fantasma boton--pequeno"
                    onClick={() => eliminar(c.id)}
                    aria-label={`Eliminar ${c.nombreArchivo}`}
                  >
                    <Icono nombre="papelera" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
      {gasto.estado !== 'ANULADO' && lista.length < 5 && (
        <div className="comprobantes__subir">
          <input
            ref={entrada}
            id="archivo-comprobante"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="solo-lectores"
            onChange={adjuntar}
          />
          <button type="button" className="boton boton--secundario boton--pequeno" onClick={() => entrada.current?.click()} disabled={subiendo}>
            <Icono nombre="clip" /> {subiendo ? 'Subiendo…' : 'Adjuntar comprobante'}
          </button>
          <span className="campo__ayuda">JPG, PNG, WEBP o PDF de hasta 2 MB. Máximo 5 por gasto.</span>
        </div>
      )}
    </section>
  );
}

/** Detalle del gasto con su reparto y acciones de editar o anular (HU-09). */
export default function DetalleGasto({ gastoId, alCerrar, alCambiar }) {
  const { grupoId, esAdmin, miParticipacionId } = useGrupo();
  const { datos, error, cargando, recargar } = useCarga(
    () => (gastoId ? api.gasto(grupoId, gastoId) : Promise.resolve(null)),
    [gastoId]
  );
  const [confirmar, setConfirmar] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const g = datos?.gasto;
  const puedeModificar = g && g.estado !== 'ANULADO' && (esAdmin || g.registradoPorId === miParticipacionId);

  async function anular() {
    setAnulando(true);
    setErrorAccion('');
    try {
      await api.anularGasto(grupoId, gastoId);
      setConfirmar(false);
      recargar();
      alCambiar('Gasto anulado. Los saldos se actualizaron.');
    } catch (err) {
      setConfirmar(false);
      setErrorAccion(err.message);
    } finally {
      setAnulando(false);
    }
  }

  return (
    <>
      <Dialogo abierto={Boolean(gastoId) && !confirmar} alCerrar={alCerrar} titulo={g?.descripcion ?? 'Gasto'} ancho>
        {cargando && !g ? (
          <Cargando />
        ) : error ? (
          <ErrorCarga error={error} />
        ) : g ? (
          <div className="detalle">
            <div className="detalle__cabecera">
              <p className="detalle__importe cifra">{formatoPesos(g.importe)}</p>
              <span className={`etiqueta ${g.estado === 'ANULADO' ? 'etiqueta--error' : g.estado === 'MODIFICADO' ? '' : 'etiqueta--gris'}`}>
                {ESTADOS[g.estado]}
              </span>
            </div>
            <dl className="detalle__datos">
              <div>
                <dt>Fecha</dt>
                <dd>{formatoFecha(g.fecha)}</dd>
              </div>
              <div>
                <dt>Pagó</dt>
                <dd>{g.pagador}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{g.categoria}</dd>
              </div>
              <div>
                <dt>Distribución</dt>
                <dd>{METODOS[g.metodo]}</dd>
              </div>
              <div>
                <dt>Registrado por</dt>
                <dd>{g.registradoPor}</dd>
              </div>
              {g.fechaModificacion && (
                <div>
                  <dt>Última modificación</dt>
                  <dd>{formatoFecha(g.fechaModificacion)}</dd>
                </div>
              )}
            </dl>

            <section className="detalle__seccion" aria-labelledby="titulo-reparto">
              <h3 id="titulo-reparto">Reparto</h3>
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Participante</th>
                    {g.metodo === 'PORCENTAJE' && (
                      <th scope="col" className="num">
                        Porcentaje
                      </th>
                    )}
                    <th scope="col" className="num">
                      Le corresponde
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.repartos.map((r) => (
                    <tr key={r.participacionId}>
                      <td>{r.participacionId === miParticipacionId ? `${r.nombre} (tú)` : r.nombre}</td>
                      {g.metodo === 'PORCENTAJE' && <td className="num">{r.porcentaje.toLocaleString('es-CO')} %</td>}
                      <td className="num">{formatoPesos(r.importeAsignado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <Comprobantes gasto={g} alCambiar={alCambiar} />

            {errorAccion && (
              <div className="alerta alerta--error" role="alert">
                {errorAccion}
              </div>
            )}

            {puedeModificar ? (
              <div className="dialogo__acciones">
                <button type="button" className="boton boton--peligro" onClick={() => setConfirmar(true)}>
                  <Icono nombre="papelera" /> Anular gasto
                </button>
                <Link to={`/grupos/${grupoId}/gastos/${g.id}/editar`} className="boton boton--primario">
                  <Icono nombre="editar" /> Editar gasto
                </Link>
              </div>
            ) : (
              g.estado !== 'ANULADO' && (
                <p className="texto-suave detalle__nota">Solo {g.registradoPor} o el administrador del grupo pueden editar o anular este gasto.</p>
              )
            )}
          </div>
        ) : null}
      </Dialogo>

      <DialogoConfirmar
        abierto={confirmar}
        alCerrar={() => setConfirmar(false)}
        titulo="¿Anular este gasto?"
        mensaje={`"${g?.descripcion}" por ${formatoPesos(g?.importe)} dejará de contar en los saldos. Seguirá visible en el historial marcado como anulado.`}
        textoConfirmar="Anular gasto"
        alConfirmar={anular}
        ocupado={anulando}
      />
    </>
  );
}
