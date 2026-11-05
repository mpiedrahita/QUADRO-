import { Link } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { Cargando, ErrorCarga, Vacio } from '../../components/Estados.jsx';
import { MarcaQuadro } from '../../components/Logo.jsx';
import Icono from '../../components/Icono.jsx';
import { formatoPesos, formatoSaldo } from '../../utils/formato.js';
import { useGrupo } from './Grupo.jsx';

/**
 * Balanza del grupo: cada integrante es una barra que sale de un eje central.
 * A la izquierda (ámbar) lo que debe; a la derecha (verde) lo que tiene a favor.
 */
function Balanza({ saldos }) {
  const maximo = Math.max(1, ...saldos.map((s) => Math.abs(s.saldo)));
  return (
    <div className="balanza" role="table" aria-label="Saldo de cada integrante">
      <div className="balanza__ejes" role="row" aria-hidden="true">
        <span />
        <span className="balanza__eje-debe">Debe</span>
        <span className="balanza__eje-favor">A favor</span>
        <span />
      </div>
      {saldos.map((s) => {
        const ancho = `${(Math.abs(s.saldo) / maximo) * 100}%`;
        return (
          <div className="balanza__fila" role="row" key={s.participacionId}>
            <span className="balanza__nombre" role="rowheader">
              {s.nombre}
              {s.esUsted && <span className="balanza__usted"> (tú)</span>}
            </span>
            <span className="balanza__lado balanza__lado--debe" role="cell" aria-hidden="true">
              {s.saldo < 0 && <span className="balanza__barra balanza__barra--debe" style={{ width: ancho }} />}
            </span>
            <span className="balanza__lado balanza__lado--favor" role="cell" aria-hidden="true">
              {s.saldo > 0 && <span className="balanza__barra balanza__barra--favor" style={{ width: ancho }} />}
            </span>
            <span
              role="cell"
              className={`balanza__valor cifra ${s.saldo > 0 ? 'saldo-positivo' : s.saldo < 0 ? 'saldo-negativo' : ''}`}
            >
              {formatoSaldo(s.saldo)}
              <span className="solo-lectores">{s.saldo > 0 ? ' a favor' : s.saldo < 0 ? ' en contra' : ' sin saldo pendiente'}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiPosicion({ miSaldo }) {
  const { saldo, pagado, asignado, enviado, recibido } = miSaldo;
  const titular = saldo > 0 ? 'El grupo te debe' : saldo < 0 ? 'Le debes al grupo' : 'Estás al día';
  return (
    <section className="posicion" aria-labelledby="mi-posicion">
      <h2 id="mi-posicion" className="posicion__titulo">
        {titular}
      </h2>
      <p className={`posicion__cifra cifra ${saldo > 0 ? 'saldo-positivo' : saldo < 0 ? 'saldo-negativo' : ''}`}>
        {formatoPesos(Math.abs(saldo))}
      </p>
      <dl className="posicion__detalle">
        <div>
          <dt>Pagaste</dt>
          <dd className="cifra">{formatoPesos(pagado)}</dd>
        </div>
        <div>
          <dt>Te corresponde</dt>
          <dd className="cifra">{formatoPesos(asignado)}</dd>
        </div>
        {(enviado > 0 || recibido > 0) && (
          <>
            <div>
              <dt>Liquidaciones enviadas</dt>
              <dd className="cifra">{formatoPesos(enviado)}</dd>
            </div>
            <div>
              <dt>Liquidaciones recibidas</dt>
              <dd className="cifra">{formatoPesos(recibido)}</dd>
            </div>
          </>
        )}
      </dl>
    </section>
  );
}

/** HU-06 · RF-08 · RF-17: saldos individuales, deudas y resumen financiero. */
export default function Saldos() {
  const { grupoId, esAdmin, miParticipacionId } = useGrupo();
  const { datos, error, cargando, recargar } = useCarga(() => api.saldos(grupoId), [grupoId]);

  if (cargando && !datos) return <Cargando texto="Calculando saldos…" />;
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />;

  const { resumen, saldos, deudas, miSaldo } = datos;

  if (!resumen.hayMovimientos) {
    return (
      <div className="pila">
        <Vacio
          titulo="Aún no hay gastos registrados"
          accion={
            <Link to={`/grupos/${grupoId}/gastos/nuevo`} className="boton boton--primario">
              <Icono nombre="mas" /> Registrar el primer gasto
            </Link>
          }
        >
          Todos los saldos están en $0. Cuando alguien registre un gasto, aquí verás cuánto aportó cada integrante, cuánto le
          corresponde y quién le debe a quién.
        </Vacio>
        <section className="panel">
          <div className="panel__titulo">
            <h2>Balance del grupo</h2>
          </div>
          <Balanza saldos={saldos} />
        </section>
      </div>
    );
  }

  const cuadradas = deudas.length === 0;

  return (
    <div className="saldos">
      <MiPosicion miSaldo={miSaldo} />

      <section className="panel saldos__balanza" aria-labelledby="titulo-balance">
        <div className="panel__titulo">
          <h2 id="titulo-balance">Balance del grupo</h2>
          <p>Lo que cada quien pagó menos lo que le corresponde, más las liquidaciones.</p>
        </div>
        {cuadradas && (
          <div className="cuadradas">
            <MarcaQuadro className="cuadradas__marca" fondo="var(--papel)" />
            <div>
              <strong>Cuentas cuadradas</strong>
              <p>Nadie le debe nada a nadie en este grupo.</p>
            </div>
          </div>
        )}
        <Balanza saldos={saldos} />
      </section>

      <section className="panel" aria-labelledby="titulo-deudas">
        <div className="panel__titulo">
          <h2 id="titulo-deudas">Deudas pendientes</h2>
          {!cuadradas && <p className="cifra">{formatoPesos(resumen.deudaPendiente)} en total</p>}
        </div>
        {cuadradas ? (
          <p className="texto-suave">No hay deudas pendientes.</p>
        ) : (
          <ul className="lista">
            {deudas.map((d) => {
              const puede = esAdmin || d.deudorId === miParticipacionId || d.acreedorId === miParticipacionId;
              return (
                <li key={`${d.deudorId}-${d.acreedorId}`} className="deuda">
                  <span>
                    {d.deudorId === miParticipacionId ? (
                      <>
                        Le debes a <strong>{d.acreedor}</strong>
                      </>
                    ) : d.acreedorId === miParticipacionId ? (
                      <>
                        <strong>{d.deudor}</strong> te debe
                      </>
                    ) : (
                      <>
                        <strong>{d.deudor}</strong> le debe a <strong>{d.acreedor}</strong>
                      </>
                    )}
                  </span>
                  <span className="cifra deuda__valor">{formatoPesos(d.importe)}</span>
                  {puede && (
                    <Link
                      className="boton boton--secundario boton--pequeno"
                      to={`/grupos/${grupoId}/liquidaciones?emisor=${d.deudorId}&receptor=${d.acreedorId}&importe=${d.importe}`}
                    >
                      Registrar liquidación
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="titulo-resumen">
        <div className="panel__titulo">
          <h2 id="titulo-resumen">Resumen del grupo</h2>
        </div>
        <dl className="resumen-cifras">
          <div>
            <dt>Total gastado</dt>
            <dd className="cifra">{formatoPesos(resumen.totalGastado)}</dd>
          </div>
          <div>
            <dt>Gastos vigentes</dt>
            <dd className="cifra">{resumen.numeroGastos}</dd>
          </div>
          <div>
            <dt>Liquidado entre integrantes</dt>
            <dd className="cifra">{formatoPesos(resumen.totalLiquidado)}</dd>
          </div>
        </dl>
        {resumen.porCategoria.length > 0 && (
          <>
            <h3 className="subtitulo">Gasto por categoría</h3>
            <ul className="categorias-barras">
              {resumen.porCategoria.map((c) => (
                <li key={c.categoriaId}>
                  <span className="categorias-barras__nombre">{c.nombre}</span>
                  <span className="categorias-barras__pista" aria-hidden="true">
                    <span style={{ width: `${(c.total / resumen.totalGastado) * 100}%` }} />
                  </span>
                  <span className="cifra">{formatoPesos(c.total)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel saldos__tabla" aria-labelledby="titulo-detalle">
        <div className="panel__titulo">
          <h2 id="titulo-detalle">Detalle por integrante</h2>
        </div>
        <div className="desplazable">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Integrante</th>
                <th scope="col" className="num">
                  Pagó
                </th>
                <th scope="col" className="num">
                  Le corresponde
                </th>
                <th scope="col" className="num">
                  Liquidaciones enviadas
                </th>
                <th scope="col" className="num">
                  Liquidaciones recibidas
                </th>
                <th scope="col" className="num">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.participacionId}>
                  <th scope="row">
                    {s.nombre}
                    {s.estado === 'RETIRADA' && <span className="etiqueta etiqueta--gris"> Retirado</span>}
                  </th>
                  <td className="num">{formatoPesos(s.pagado)}</td>
                  <td className="num">{formatoPesos(s.asignado)}</td>
                  <td className="num">{formatoPesos(s.enviado)}</td>
                  <td className="num">{formatoPesos(s.recibido)}</td>
                  <td className={`num ${s.saldo > 0 ? 'saldo-positivo' : s.saldo < 0 ? 'saldo-negativo' : ''}`}>
                    <strong>{formatoSaldo(s.saldo)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
