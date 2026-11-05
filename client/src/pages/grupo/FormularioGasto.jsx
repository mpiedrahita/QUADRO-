import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { calcularReparto } from '@dominio/reparto.js';
import { api } from '../../api/cliente.js';
import { useAvisos } from '../../components/Avisos.jsx';
import { CampoDinero, CampoSelector, CampoTexto } from '../../components/Campo.jsx';
import { Cargando, ErrorCarga } from '../../components/Estados.jsx';
import Icono from '../../components/Icono.jsx';
import { METODOS, formatoPesos, hoyLocal } from '../../utils/formato.js';
import { useGrupo } from './Grupo.jsx';

/**
 * HU-04 · HU-05 · HU-09: registrar o editar un gasto y definir cómo se reparte.
 * La vista previa usa la misma función de reparto del backend; el backend vuelve a validar al guardar.
 */
export default function FormularioGasto() {
  const { gastoId } = useParams();
  const editando = Boolean(gastoId);
  const { grupoId, participantes, categorias, miParticipacionId, esAdmin, cargandoDatos, recargarLista, recargarCategorias } = useGrupo();
  const navegar = useNavigate();
  const avisar = useAvisos();

  const [datos, setDatos] = useState(null);
  const [seleccion, setSeleccion] = useState({}); // participacionId -> { incluido, porcentaje, valor }
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  // Valores iniciales: nuevo gasto o gasto existente.
  useEffect(() => {
    if (cargandoDatos || datos) return;
    if (!editando) {
      setDatos({
        descripcion: '',
        importe: null,
        fecha: hoyLocal(),
        categoriaId: categorias[0]?.id ?? '',
        pagadorId: miParticipacionId,
        metodo: 'IGUAL',
      });
      setSeleccion(Object.fromEntries(participantes.map((p) => [p.id, { incluido: true, porcentaje: '', valor: null }])));
      return;
    }
    api
      .gasto(grupoId, gastoId)
      .then(({ gasto }) => {
        if (gasto.estado === 'ANULADO') throw new Error('Este gasto está anulado y no puede editarse.');
        if (!esAdmin && gasto.registradoPorId !== miParticipacionId) {
          throw new Error(`Solo ${gasto.registradoPor} o el administrador del grupo pueden editar este gasto.`);
        }
        setDatos({
          descripcion: gasto.descripcion,
          importe: gasto.importe,
          fecha: gasto.fecha,
          categoriaId: gasto.categoriaId,
          pagadorId: gasto.pagadorId,
          metodo: gasto.metodo,
        });
        const porId = new Map(gasto.repartos.map((r) => [r.participacionId, r]));
        setSeleccion(
          Object.fromEntries(
            participantes.map((p) => {
              const r = porId.get(p.id);
              return [p.id, { incluido: Boolean(r), porcentaje: r?.porcentaje ?? '', valor: r ? r.importeAsignado : null }];
            })
          )
        );
      })
      .catch(setErrorCarga);
  }, [cargandoDatos, datos, editando, grupoId, gastoId, participantes, categorias, miParticipacionId, esAdmin]);

  const incluidos = participantes.filter((p) => seleccion[p.id]?.incluido);

  const repartosEnvio = useMemo(
    () =>
      incluidos.map((p) => ({
        participacionId: p.id,
        ...(datos?.metodo === 'PORCENTAJE' ? { porcentaje: seleccion[p.id].porcentaje === '' ? null : Number(seleccion[p.id].porcentaje) } : {}),
        ...(datos?.metodo === 'VALOR' ? { valor: seleccion[p.id].valor } : {}),
      })),
    [incluidos, seleccion, datos?.metodo]
  );

  // Vista previa del reparto con la regla de redondeo del sistema.
  const vista = useMemo(() => {
    if (!datos || !datos.importe) return { error: null, repartos: null };
    try {
      const repartos = calcularReparto({ importe: datos.importe, metodo: datos.metodo, participantes: repartosEnvio });
      return { error: null, repartos: new Map(repartos.map((r) => [r.participacionId, r.importeAsignado])) };
    } catch (e) {
      return { error: e.message, repartos: null };
    }
  }, [datos, repartosEnvio]);

  if (errorCarga) return <ErrorCarga error={errorCarga} />;
  if (!datos) return <Cargando texto="Preparando el formulario…" />;

  // Al editar un campo se borra su error anterior.
  const limpiarError = (campo) => setErrores(({ [campo]: _omitido, ...resto }) => resto);
  const cambiar = (campo) => (e) => {
    limpiarError(campo);
    setDatos((d) => ({ ...d, [campo]: e.target.value }));
  };
  const cambiarSeleccion = (id, cambios) => {
    limpiarError('repartos');
    setSeleccion((s) => ({ ...s, [id]: { ...s[id], ...cambios } }));
  };
  const todos = incluidos.length === participantes.length;

  const sumaPct = incluidos.reduce((a, p) => a + (Number(seleccion[p.id].porcentaje) || 0), 0);
  const sumaValores = incluidos.reduce((a, p) => a + (seleccion[p.id].valor || 0), 0);

  function repartirPorcentajesIguales() {
    const n = incluidos.length;
    if (!n) return;
    const base = Math.floor(10000 / n);
    const resto = 10000 - base * n;
    setSeleccion((s) => {
      const nuevo = { ...s };
      incluidos.forEach((p, i) => {
        nuevo[p.id] = { ...nuevo[p.id], porcentaje: (base + (i < resto ? 1 : 0)) / 100 };
      });
      return nuevo;
    });
  }

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje('');
    const cuerpo = { ...datos, importe: datos.importe ?? 0, repartos: repartosEnvio };
    try {
      if (editando) await api.editarGasto(grupoId, gastoId, cuerpo);
      else await api.crearGasto(grupoId, cuerpo);
      avisar(editando ? 'Cambios guardados. Los saldos se recalcularon.' : 'Gasto registrado');
      recargarLista();
      recargarCategorias();
      navegar(`/grupos/${grupoId}/gastos`);
    } catch (error) {
      setErrores(error.campos ?? {});
      setMensaje(error.message);
      setEnviando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <form className="formulario-gasto" onSubmit={enviar} noValidate>
      <div className="formulario-gasto__encabezado">
        <h2>{editando ? 'Editar gasto' : 'Registrar gasto'}</h2>
        <p className="texto-suave">
          {editando ? 'Al guardar, el gasto queda como modificado y los saldos se recalculan.' : 'Anota la compra, quién la pagó y entre quiénes se reparte.'}
        </p>
      </div>

      {mensaje && (
        <div className="alerta alerta--error" role="alert">
          {Object.keys(errores).length > 0 ? 'No se guardó el gasto. Revisa los campos marcados.' : mensaje}
        </div>
      )}

      <section className="panel formulario">
        <h3>Datos del gasto</h3>
        <CampoTexto
          etiqueta="Descripción"
          value={datos.descripcion}
          onChange={cambiar('descripcion')}
          error={errores.descripcion}
          placeholder="Ej.: Harina de maíz y queso"
          maxLength={120}
        />
        <div className="formulario__fila">
          <CampoDinero
            etiqueta="Importe"
            valor={datos.importe}
            alCambiar={(importe) => {
              limpiarError('importe');
              setDatos((d) => ({ ...d, importe }));
            }}
            error={errores.importe}
            placeholder="0"
          />
          <CampoTexto etiqueta="Fecha" type="date" value={datos.fecha} max={hoyLocal()} onChange={cambiar('fecha')} error={errores.fecha} />
        </div>
        <div className="formulario__fila">
          <CampoSelector etiqueta="Categoría" value={datos.categoriaId} onChange={cambiar('categoriaId')} error={errores.categoriaId}>
            {categorias.length === 0 && <option value="">No hay categorías</option>}
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </CampoSelector>
          <CampoSelector etiqueta="¿Quién pagó?" value={datos.pagadorId} onChange={cambiar('pagadorId')} error={errores.pagadorId}>
            {participantes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === miParticipacionId ? `${p.nombre} (tú)` : p.nombre}
              </option>
            ))}
          </CampoSelector>
        </div>
      </section>

      <section className="panel formulario" aria-labelledby="titulo-distribucion">
        <h3 id="titulo-distribucion">¿Cómo se reparte?</h3>
        <div className="segmentado" role="radiogroup" aria-label="Método de distribución">
          {Object.entries(METODOS).map(([clave, texto]) => (
            <label key={clave} className="segmentado__opcion">
              <input type="radio" name="metodo" value={clave} checked={datos.metodo === clave} onChange={cambiar('metodo')} />
              <span>{texto}</span>
            </label>
          ))}
        </div>

        <div className="reparto">
          <div className="reparto__cabecera">
            <label className="casilla">
              <input
                type="checkbox"
                checked={todos}
                onChange={(e) =>
                  setSeleccion((s) => Object.fromEntries(Object.entries(s).map(([id, v]) => [id, { ...v, incluido: e.target.checked }])))
                }
              />
              Todos los integrantes
            </label>
            {datos.metodo === 'PORCENTAJE' && incluidos.length > 0 && (
              <button type="button" className="boton boton--fantasma boton--pequeno" onClick={repartirPorcentajesIguales}>
                Repartir 100 % por igual
              </button>
            )}
          </div>
          <ul className="lista reparto__lista">
            {participantes.map((p) => {
              const s = seleccion[p.id] ?? {};
              const monto = vista.repartos?.get(p.id);
              return (
                <li key={p.id} className={`reparto__fila ${s.incluido ? '' : 'reparto__fila--fuera'}`}>
                  <label className="casilla reparto__persona">
                    <input type="checkbox" checked={Boolean(s.incluido)} onChange={(e) => cambiarSeleccion(p.id, { incluido: e.target.checked })} />
                    {p.id === miParticipacionId ? `${p.nombre} (tú)` : p.nombre}
                  </label>
                  {!(s.incluido && datos.metodo !== 'IGUAL') && <span aria-hidden="true" />}
                  {s.incluido && datos.metodo === 'PORCENTAJE' && (
                    <span className="reparto__entrada">
                      <input
                        className="campo__control"
                        inputMode="decimal"
                        aria-label={`Porcentaje de ${p.nombre}`}
                        value={s.porcentaje}
                        onChange={(e) => cambiarSeleccion(p.id, { porcentaje: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })}
                        placeholder="0"
                      />
                      <span aria-hidden="true">%</span>
                    </span>
                  )}
                  {s.incluido && datos.metodo === 'VALOR' && (
                    <span className="reparto__entrada reparto__entrada--dinero">
                      <span aria-hidden="true">$</span>
                      <input
                        className="campo__control"
                        inputMode="numeric"
                        aria-label={`Valor de ${p.nombre}`}
                        value={s.valor ? s.valor.toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, '');
                          cambiarSeleccion(p.id, { valor: d === '' ? null : Number(d) });
                        }}
                        placeholder="0"
                      />
                    </span>
                  )}
                  <span className="reparto__monto cifra">{s.incluido ? (monto !== undefined ? formatoPesos(monto) : '—') : 'No participa'}</span>
                </li>
              );
            })}
          </ul>
          <div className={`reparto__resumen ${vista.error && datos.importe ? 'reparto__resumen--error' : ''}`} aria-live="polite">
            {!datos.importe ? (
              <span>Escribe el importe para ver cuánto le corresponde a cada persona.</span>
            ) : vista.error ? (
              <span>
                <Icono nombre="alerta" className="icono-mini" /> {vista.error}
              </span>
            ) : (
              <span>
                <Icono nombre="check" className="icono-mini" /> El reparto suma {formatoPesos(datos.importe)}.
                {datos.metodo === 'IGUAL' && incluidos.length > 1 && ' Si no es divisible, los pesos sobrantes se asignan a los primeros de la lista.'}
              </span>
            )}
            {datos.metodo === 'PORCENTAJE' && <span className="cifra">Suman {sumaPct.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %</span>}
            {datos.metodo === 'VALOR' && <span className="cifra">Asignado {formatoPesos(sumaValores)}</span>}
          </div>
          {errores.repartos && errores.repartos !== vista.error && <p className="campo__error">{errores.repartos}</p>}
        </div>
      </section>

      <div className="formulario-gasto__acciones">
        <Link to={`/grupos/${grupoId}/gastos`} className="boton boton--secundario">
          Cancelar
        </Link>
        <button type="submit" className="boton boton--primario" disabled={enviando}>
          {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar gasto'}
        </button>
      </div>
    </form>
  );
}
