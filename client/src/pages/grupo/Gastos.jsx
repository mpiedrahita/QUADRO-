import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAvisos } from '../../components/Avisos.jsx';
import { CampoSelector, CampoTexto } from '../../components/Campo.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../components/Estados.jsx';
import Icono from '../../components/Icono.jsx';
import DetalleGasto from './DetalleGasto.jsx';
import { formatoFecha, formatoPesos } from '../../utils/formato.js';
import { useGrupo } from './Grupo.jsx';

const FILTROS_VACIOS = { desde: '', hasta: '', categoriaId: '', participanteId: '', incluirAnulados: false };

/** HU-07 · RF-12: historial de gastos con filtros por fecha, categoría y participante. */
export default function Gastos() {
  const { grupoId, categorias, participantes, miParticipacionId } = useGrupo();
  const avisar = useAvisos();
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [abierto, setAbierto] = useState(null);
  const { datos, error, cargando, recargar } = useCarga(() => api.gastos(grupoId, filtros), [grupoId, JSON.stringify(filtros)]);

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VACIOS);
  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const gastos = datos?.gastos ?? [];
  const total = gastos.filter((g) => g.estado !== 'ANULADO').reduce((a, g) => a + g.importe, 0);

  return (
    <div className="pila">
      <section className="panel filtros" aria-labelledby="titulo-filtros">
        <h2 id="titulo-filtros" className="solo-lectores">
          Filtros del historial
        </h2>
        <div className="filtros__campos">
          <CampoTexto etiqueta="Desde" type="date" value={filtros.desde} onChange={cambiar('desde')} max={filtros.hasta || undefined} />
          <CampoTexto etiqueta="Hasta" type="date" value={filtros.hasta} onChange={cambiar('hasta')} min={filtros.desde || undefined} />
          <CampoSelector etiqueta="Categoría" value={filtros.categoriaId} onChange={cambiar('categoriaId')}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </CampoSelector>
          <CampoSelector etiqueta="Participante" value={filtros.participanteId} onChange={cambiar('participanteId')}>
            <option value="">Todos</option>
            {participantes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </CampoSelector>
        </div>
        <div className="filtros__pie">
          <label className="casilla">
            <input type="checkbox" checked={filtros.incluirAnulados} onChange={cambiar('incluirAnulados')} />
            Mostrar gastos anulados
          </label>
          {hayFiltros && (
            <button type="button" className="boton boton--fantasma boton--pequeno" onClick={() => setFiltros(FILTROS_VACIOS)}>
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {error ? (
        <ErrorCarga error={error} alReintentar={recargar} />
      ) : cargando && !datos ? (
        <Cargando texto="Cargando gastos…" />
      ) : gastos.length === 0 ? (
        hayFiltros ? (
          <Vacio titulo="Ningún gasto coincide con los filtros">Prueba con otro rango de fechas, categoría o participante.</Vacio>
        ) : (
          <Vacio
            titulo="Todavía no hay gastos"
            accion={
              <Link to={`/grupos/${grupoId}/gastos/nuevo`} className="boton boton--primario">
                <Icono nombre="mas" /> Registrar gasto
              </Link>
            }
          >
            Registra la primera compra del emprendimiento: quién la pagó y entre quiénes se reparte.
          </Vacio>
        )
      ) : (
        <section className="panel panel--lista" aria-labelledby="titulo-historial">
          <div className="panel__titulo">
            <h2 id="titulo-historial">Historial de gastos</h2>
            <p className="cifra">
              {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}, {formatoPesos(total)}
            </p>
          </div>
          <ul className="lista gastos">
            {gastos.map((g) => {
              const miParte = g.repartos.find((r) => r.participacionId === miParticipacionId)?.importeAsignado;
              return (
                <li key={g.id} className={g.estado === 'ANULADO' ? 'gasto gasto--anulado' : 'gasto'}>
                  <button type="button" className="gasto__boton" onClick={() => setAbierto(g.id)}>
                    <span className="gasto__fecha">{formatoFecha(g.fecha)}</span>
                    <span className="gasto__principal">
                      <strong>{g.descripcion}</strong>
                      <span className="gasto__meta">
                        Pagó {g.pagadorId === miParticipacionId ? 'tú' : g.pagador}
                        <span className="etiqueta etiqueta--gris">{g.categoria}</span>
                        {g.estado === 'MODIFICADO' && <span className="etiqueta">Modificado</span>}
                        {g.estado === 'ANULADO' && <span className="etiqueta etiqueta--error">Anulado</span>}
                        {g.comprobantes > 0 && (
                          <span className="gasto__clip" title={`${g.comprobantes} comprobante(s)`}>
                            <Icono nombre="clip" className="icono-mini" titulo={`${g.comprobantes} comprobante(s)`} />
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="gasto__importes">
                      <strong className="cifra">{formatoPesos(g.importe)}</strong>
                      <span className="cifra">{miParte !== undefined ? `Tu parte: ${formatoPesos(miParte)}` : 'No participas'}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <DetalleGasto
        gastoId={abierto}
        alCerrar={() => setAbierto(null)}
        alCambiar={(texto) => {
          recargar();
          if (texto) avisar(texto);
        }}
      />
    </div>
  );
}
