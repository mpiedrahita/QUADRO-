import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useAvisos } from '../../components/Avisos.jsx';
import { CampoTexto } from '../../components/Campo.jsx';
import { DialogoConfirmar } from '../../components/Dialogo.jsx';
import { Cargando, ErrorCarga } from '../../components/Estados.jsx';
import Icono from '../../components/Icono.jsx';
import { formatoFecha, iniciales } from '../../utils/formato.js';
import { useGrupo } from './Grupo.jsx';

/** HU-03 · RF-04: el administrador agrega o retira participantes. */
export default function Integrantes() {
  const { grupoId, esAdmin, miParticipacionId, recargarParticipantes } = useGrupo();
  const avisar = useAvisos();
  const [verRetirados, setVerRetirados] = useState(false);
  const { datos, error, cargando, recargar } = useCarga(() => api.participantes(grupoId, verRetirados), [grupoId, verRetirados]);
  const [correo, setCorreo] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [porRetirar, setPorRetirar] = useState(null);
  const [retirando, setRetirando] = useState(false);
  const [errorRetiro, setErrorRetiro] = useState('');

  const actualizar = () => {
    recargar();
    recargarParticipantes();
  };

  async function agregar(e) {
    e.preventDefault();
    setAgregando(true);
    setErrorCorreo('');
    try {
      const { participante } = await api.agregarParticipante(grupoId, correo);
      avisar(`${participante.nombre} ahora es integrante del grupo`);
      setCorreo('');
      actualizar();
    } catch (error) {
      setErrorCorreo(error.campos?.correo ? `${error.campos.correo} ${error.estado === 404 ? 'Pídele que cree su cuenta primero.' : ''}` : error.message);
    } finally {
      setAgregando(false);
    }
  }

  async function retirar() {
    setRetirando(true);
    setErrorRetiro('');
    try {
      await api.retirarParticipante(grupoId, porRetirar.id);
      avisar(`${porRetirar.nombre} fue retirado del grupo`);
      actualizar();
      setPorRetirar(null);
    } catch (error) {
      setPorRetirar(null);
      setErrorRetiro(error.message);
    } finally {
      setRetirando(false);
    }
  }

  const lista = datos?.participantes ?? [];

  return (
    <div className="dos-columnas">
      <section className="panel panel--lista" aria-labelledby="titulo-integrantes">
        <div className="panel__titulo">
          <h2 id="titulo-integrantes">Integrantes</h2>
          <label className="casilla">
            <input type="checkbox" checked={verRetirados} onChange={(e) => setVerRetirados(e.target.checked)} />
            Mostrar retirados
          </label>
        </div>
        {errorRetiro && (
          <div className="alerta alerta--aviso" role="alert" style={{ marginBottom: 'var(--e-3)' }}>
            {errorRetiro}
          </div>
        )}
        {error ? (
          <ErrorCarga error={error} alReintentar={recargar} />
        ) : cargando && !datos ? (
          <Cargando />
        ) : (
          <ul className="lista">
            {lista.map((p) => (
              <li key={p.id} className={`integrante ${p.estado === 'RETIRADA' ? 'integrante--retirado' : ''}`}>
                <span className="avatar" aria-hidden="true">
                  {iniciales(p.nombre)}
                </span>
                <span className="integrante__datos">
                  <strong>
                    {p.nombre}
                    {p.id === miParticipacionId && ' (tú)'}
                  </strong>
                  <span>{p.correo}</span>
                  <span className="texto-suave">
                    {p.estado === 'RETIRADA' ? `Retirado el ${formatoFecha(p.fechaRetiro)}` : `Desde el ${formatoFecha(p.fechaIngreso)}`}
                  </span>
                </span>
                <span className="integrante__rol">
                  {p.rol === 'ADMINISTRADOR' ? <span className="etiqueta">Administrador</span> : <span className="etiqueta etiqueta--gris">Integrante</span>}
                </span>
                {esAdmin && p.rol !== 'ADMINISTRADOR' && p.estado === 'ACTIVA' && (
                  <button type="button" className="boton boton--fantasma boton--pequeno" onClick={() => setPorRetirar(p)}>
                    Retirar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {esAdmin ? (
        <section className="panel" aria-labelledby="titulo-agregar">
          <div className="panel__titulo">
            <h2 id="titulo-agregar">Agregar integrante</h2>
          </div>
          <form className="formulario" onSubmit={agregar} noValidate>
            <CampoTexto
              etiqueta="Correo de su cuenta en Quadro"
              type="email"
              value={correo}
              onChange={(e) => {
                setErrorCorreo('');
                setCorreo(e.target.value);
              }}
              error={errorCorreo}
              ayuda="La persona debe haberse registrado antes en Quadro con este correo."
              placeholder="nombre@correo.com"
            />
            <button type="submit" className="boton boton--primario" disabled={agregando}>
              <Icono nombre="mas" /> {agregando ? 'Agregando…' : 'Agregar integrante'}
            </button>
          </form>
        </section>
      ) : (
        <section className="panel">
          <h2>¿Falta alguien?</h2>
          <p className="texto-suave" style={{ marginTop: 'var(--e-2)' }}>
            Solo el administrador del grupo puede agregar o retirar integrantes. Pídele que lo agregue con el correo de su cuenta.
          </p>
        </section>
      )}

      <DialogoConfirmar
        abierto={Boolean(porRetirar)}
        alCerrar={() => setPorRetirar(null)}
        titulo={`¿Retirar a ${porRetirar?.nombre}?`}
        mensaje="Dejará de ver el grupo y no podrá incluirse en gastos nuevos. Su historial se conserva. Solo se puede retirar a quien no tiene deudas pendientes."
        textoConfirmar="Retirar integrante"
        alConfirmar={retirar}
        ocupado={retirando}
      />
    </div>
  );
}
