import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAvisos } from '../../components/Avisos.jsx';
import { CampoDinero, CampoSelector, CampoTexto } from '../../components/Campo.jsx';
import { DialogoConfirmar } from '../../components/Dialogo.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../components/Estados.jsx';
import { formatoFecha, formatoPesos, hoyLocal } from '../../utils/formato.js';
import { useGrupo } from './Grupo.jsx';

/** HU-13 · RF-19 · CU-11: registrar pagos entre integrantes para saldar deudas. */
export default function Liquidaciones() {
  const { grupoId, participantes, miParticipacionId, esAdmin } = useGrupo();
  const [parametros, setParametros] = useSearchParams();
  const avisar = useAvisos();
  const lista = useCarga(() => api.liquidaciones(grupoId), [grupoId]);
  const saldos = useCarga(() => api.saldos(grupoId), [grupoId]);

  const vacio = { emisorId: miParticipacionId, receptorId: '', importe: null, fecha: hoyLocal(), nota: '' };
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [porAnular, setPorAnular] = useState(null);
  const [anulando, setAnulando] = useState(false);

  // Datos que llegan desde "Registrar liquidación" en la pestaña Saldos.
  useEffect(() => {
    const emisor = parametros.get('emisor');
    if (emisor) {
      setDatos((d) => ({ ...d, emisorId: emisor, receptorId: parametros.get('receptor') ?? '', importe: Number(parametros.get('importe')) || null }));
      setParametros({}, { replace: true });
    }
  }, [parametros, setParametros]);

  const deudas = saldos.datos?.deudas ?? [];
  const pendiente = deudas.find((d) => d.deudorId === datos.emisorId && d.acreedorId === datos.receptorId)?.importe ?? 0;
  const nombre = (id) => participantes.find((p) => p.id === id)?.nombre ?? '';
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function registrar(e) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje('');
    try {
      await api.crearLiquidacion(grupoId, { ...datos, importe: datos.importe ?? 0 });
      avisar(`Liquidación registrada: ${nombre(datos.emisorId)} pagó ${formatoPesos(datos.importe)} a ${nombre(datos.receptorId)}`);
      setDatos(vacio);
      lista.recargar();
      saldos.recargar();
    } catch (error) {
      setErrores(error.campos ?? {});
      setMensaje(Object.keys(error.campos ?? {}).length ? '' : error.message);
    } finally {
      setEnviando(false);
    }
  }

  async function anular() {
    setAnulando(true);
    try {
      await api.anularLiquidacion(grupoId, porAnular.id);
      avisar('Liquidación anulada. La deuda volvió a quedar pendiente.');
      lista.recargar();
      saldos.recargar();
    } catch (error) {
      avisar(error.message, 'error');
    } finally {
      setAnulando(false);
      setPorAnular(null);
    }
  }

  const liquidaciones = lista.datos?.liquidaciones ?? [];

  return (
    <div className="dos-columnas">
      <section className="panel" aria-labelledby="titulo-nueva-liquidacion">
        <div className="panel__titulo">
          <h2 id="titulo-nueva-liquidacion">Registrar liquidación</h2>
        </div>
        <p className="texto-suave" style={{ marginBottom: 'var(--e-4)' }}>
          Anota cuando un integrante le paga a otro para saldar una deuda del grupo.
        </p>
        {mensaje && (
          <div className="alerta alerta--error" role="alert" style={{ marginBottom: 'var(--e-4)' }}>
            {mensaje}
          </div>
        )}
        <form className="formulario" onSubmit={registrar} noValidate>
          <div className="formulario__fila">
            <CampoSelector etiqueta="Quién paga" value={datos.emisorId} onChange={cambiar('emisorId')} error={errores.emisorId}>
              {participantes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === miParticipacionId ? `${p.nombre} (tú)` : p.nombre}
                </option>
              ))}
            </CampoSelector>
            <CampoSelector etiqueta="Quién recibe" value={datos.receptorId} onChange={cambiar('receptorId')} error={errores.receptorId}>
              <option value="">Selecciona…</option>
              {participantes
                .filter((p) => p.id !== datos.emisorId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === miParticipacionId ? `${p.nombre} (tú)` : p.nombre}
                  </option>
                ))}
            </CampoSelector>
          </div>
          {datos.receptorId && (
            <div className={`alerta ${pendiente > 0 ? 'alerta--info' : 'alerta--aviso'}`}>
              {pendiente > 0 ? (
                <span>
                  {nombre(datos.emisorId)} le debe <strong className="cifra">{formatoPesos(pendiente)}</strong> a {nombre(datos.receptorId)}.{' '}
                  <button type="button" className="enlace" onClick={() => setDatos((d) => ({ ...d, importe: pendiente }))}>
                    Usar el total
                  </button>
                </span>
              ) : (
                <span>
                  {nombre(datos.emisorId)} no tiene deudas pendientes con {nombre(datos.receptorId)}.
                </span>
              )}
            </div>
          )}
          <div className="formulario__fila">
            <CampoDinero
              etiqueta="Importe"
              valor={datos.importe}
              alCambiar={(importe) => setDatos((d) => ({ ...d, importe }))}
              error={errores.importe}
              placeholder="0"
            />
            <CampoTexto etiqueta="Fecha" type="date" value={datos.fecha} max={hoyLocal()} onChange={cambiar('fecha')} error={errores.fecha} />
          </div>
          <CampoTexto
            etiqueta="Nota"
            opcional
            value={datos.nota}
            onChange={cambiar('nota')}
            error={errores.nota}
            placeholder="Ej.: Transferencia por Nequi"
            maxLength={120}
          />
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Registrando…' : 'Registrar liquidación'}
          </button>
        </form>
      </section>

      <section className="panel panel--lista" aria-labelledby="titulo-historial-liq">
        <div className="panel__titulo">
          <h2 id="titulo-historial-liq">Historial de liquidaciones</h2>
        </div>
        {lista.error ? (
          <ErrorCarga error={lista.error} alReintentar={lista.recargar} />
        ) : lista.cargando && !lista.datos ? (
          <Cargando />
        ) : liquidaciones.length === 0 ? (
          <Vacio titulo="Sin liquidaciones">Cuando alguien salde una deuda, quedará registrada aquí.</Vacio>
        ) : (
          <ul className="lista">
            {liquidaciones.map((l) => {
              const puedeAnular = l.estado === 'REGISTRADA' && (esAdmin || l.registradoPorId === miParticipacionId);
              return (
                <li key={l.id} className={`liquidacion ${l.estado === 'ANULADA' ? 'liquidacion--anulada' : ''}`}>
                  <span className="liquidacion__texto">
                    <strong>
                      {l.emisor} pagó a {l.receptor}
                    </strong>
                    <span className="texto-suave">
                      {formatoFecha(l.fecha)}
                      {l.nota ? `. ${l.nota}` : ''}
                    </span>
                    {l.estado === 'ANULADA' && <span className="etiqueta etiqueta--error">Anulada</span>}
                  </span>
                  <span className="cifra liquidacion__valor">{formatoPesos(l.importe)}</span>
                  {puedeAnular && (
                    <button type="button" className="boton boton--fantasma boton--pequeno" onClick={() => setPorAnular(l)}>
                      Anular
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DialogoConfirmar
        abierto={Boolean(porAnular)}
        alCerrar={() => setPorAnular(null)}
        titulo="¿Anular esta liquidación?"
        mensaje={porAnular ? `El pago de ${porAnular.emisor} a ${porAnular.receptor} por ${formatoPesos(porAnular.importe)} dejará de contar y la deuda volverá a quedar pendiente.` : ''}
        textoConfirmar="Anular liquidación"
        alConfirmar={anular}
        ocupado={anulando}
      />
    </div>
  );
}
