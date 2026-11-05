import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/cliente.js';
import { useGrupos } from '../context/Grupos.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { useAvisos } from '../components/Avisos.jsx';
import Dialogo from '../components/Dialogo.jsx';
import Icono from '../components/Icono.jsx';
import { Campo, CampoTexto } from '../components/Campo.jsx';
import { Cargando, ErrorCarga, Vacio } from '../components/Estados.jsx';
import { formatoPesos, formatoSaldo } from '../utils/formato.js';

/** Formulario de creación y edición del grupo (HU-02 · RF-03). */
export function FormularioGrupo({ inicial, alGuardar, alCancelar, textoBoton }) {
  const [datos, setDatos] = useState({ nombre: inicial?.nombre ?? '', descripcion: inicial?.descripcion ?? '' });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje('');
    try {
      await alGuardar(datos);
    } catch (error) {
      setErrores(error.campos ?? {});
      setMensaje(Object.keys(error.campos ?? {}).length ? '' : error.message);
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {mensaje && (
        <div className="alerta alerta--error" role="alert">
          {mensaje}
        </div>
      )}
      <CampoTexto
        etiqueta="Nombre del grupo o emprendimiento"
        value={datos.nombre}
        onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
        error={errores.nombre}
        placeholder="Ej.: Arepas La Esquina"
        maxLength={80}
        autoFocus
      />
      <Campo etiqueta="Descripción" opcional error={errores.descripcion}>
        {(attrs) => (
          <textarea
            {...attrs}
            value={datos.descripcion}
            maxLength={255}
            onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
            placeholder="¿Qué hace el emprendimiento o para qué es este grupo?"
          />
        )}
      </Campo>
      <div className="dialogo__acciones">
        <button type="button" className="boton boton--secundario" onClick={alCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="boton boton--primario" disabled={enviando}>
          {enviando ? 'Guardando…' : textoBoton}
        </button>
      </div>
    </form>
  );
}

export default function MisGrupos() {
  const { usuario } = useSesion();
  const { grupos, cargando, error, recargar } = useGrupos();
  const [parametros, setParametros] = useSearchParams();
  const [crear, setCrear] = useState(false);
  const navegar = useNavigate();
  const avisar = useAvisos();

  useEffect(() => {
    if (parametros.get('crear')) {
      setCrear(true);
      setParametros({}, { replace: true });
    }
  }, [parametros, setParametros]);

  async function crearGrupo(datos) {
    const { grupo } = await api.crearGrupo(datos);
    recargar();
    setCrear(false);
    avisar(`Grupo "${grupo.nombre}" creado`);
    navegar(`/grupos/${grupo.id}/integrantes`);
  }

  const primerNombre = usuario?.nombre?.split(' ')[0];

  return (
    <div className="pagina">
      <header className="cabecera-pagina">
        <div>
          <h1>Hola, {primerNombre}</h1>
          <p className="cabecera-pagina__sub">Estos son los grupos en los que compartes gastos.</p>
        </div>
        <button type="button" className="boton boton--primario" onClick={() => setCrear(true)}>
          <Icono nombre="mas" /> Crear grupo
        </button>
      </header>

      {cargando && grupos.length === 0 ? (
        <Cargando texto="Cargando tus grupos…" />
      ) : error ? (
        <ErrorCarga error={error} alReintentar={recargar} />
      ) : grupos.length === 0 ? (
        <Vacio
          titulo="Crea tu primer grupo"
          accion={
            <button type="button" className="boton boton--primario" onClick={() => setCrear(true)}>
              <Icono nombre="mas" /> Crear grupo
            </button>
          }
        >
          Un grupo reúne a las personas de un emprendimiento que comparten gastos. Al crearlo quedas como administrador y puedes
          agregar a los demás con su correo.
        </Vacio>
      ) : (
        <ul className="lista-grupos">
          {grupos.map((g) => (
            <li key={g.id}>
              <Link to={`/grupos/${g.id}`} className="fila-grupo">
                <span className="fila-grupo__nombre">
                  <strong>{g.nombre}</strong>
                  <span>
                    {g.integrantes} {g.integrantes === 1 ? 'integrante' : 'integrantes'}, {g.numeroGastos}{' '}
                    {g.numeroGastos === 1 ? 'gasto' : 'gastos'}
                    {g.miRol === 'ADMINISTRADOR' && <span className="etiqueta">Administras</span>}
                  </span>
                </span>
                <span className="fila-grupo__dato">
                  <span>Total gastado</span>
                  <strong className="cifra">{formatoPesos(g.totalGastado)}</strong>
                </span>
                <span className="fila-grupo__dato">
                  <span>Tu saldo</span>
                  <strong className={`cifra ${g.miSaldo > 0 ? 'saldo-positivo' : g.miSaldo < 0 ? 'saldo-negativo' : ''}`}>
                    {formatoSaldo(g.miSaldo)}
                  </strong>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Dialogo
        abierto={crear}
        alCerrar={() => setCrear(false)}
        titulo="Crear grupo"
        descripcion="Quedarás como administrador. Después podrás agregar a los integrantes."
      >
        <FormularioGrupo alGuardar={crearGrupo} alCancelar={() => setCrear(false)} textoBoton="Crear grupo" />
      </Dialogo>
    </div>
  );
}
