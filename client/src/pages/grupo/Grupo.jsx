import { createContext, useContext, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useCarga } from '../../hooks/useCarga.js';
import { useGrupos } from '../../context/Grupos.jsx';
import { useAvisos } from '../../components/Avisos.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import Icono from '../../components/Icono.jsx';
import { Cargando, ErrorCarga, Vacio } from '../../components/Estados.jsx';
import { FormularioGrupo } from '../MisGrupos.jsx';

const ContextoGrupo = createContext(null);
export const useGrupo = () => useContext(ContextoGrupo);

/** Página de un grupo: cabecera, pestañas y datos compartidos (grupo, participantes, categorías). */
export default function Grupo() {
  const { grupoId } = useParams();
  const { recargar: recargarLista } = useGrupos();
  const avisar = useAvisos();
  const [editar, setEditar] = useState(false);
  const { pathname } = useLocation();
  const enFormularioGasto = /\/gastos\/(nuevo|[^/]+\/editar)$/.test(pathname);

  const grupo = useCarga(() => api.grupo(grupoId), [grupoId]);
  const participantes = useCarga(() => api.participantes(grupoId), [grupoId]);
  const categorias = useCarga(() => api.categorias(grupoId), [grupoId]);

  if (grupo.cargando && !grupo.datos) return <Cargando texto="Abriendo el grupo…" />;
  if (grupo.error) {
    return (
      <div className="pagina">
        {grupo.error.estado === 404 ? (
          <Vacio
            titulo="No encontramos este grupo"
            accion={
              <Link to="/grupos" className="boton boton--primario">
                Ir a mis grupos
              </Link>
            }
          >
            El grupo no existe o ya no perteneces a él. Si te retiraron, pide al administrador que te agregue de nuevo.
          </Vacio>
        ) : (
          <ErrorCarga error={grupo.error} alReintentar={grupo.recargar} />
        )}
      </div>
    );
  }

  const g = grupo.datos.grupo;
  const esAdmin = g.miRol === 'ADMINISTRADOR';
  const valor = {
    grupoId,
    grupo: g,
    esAdmin,
    miParticipacionId: g.miParticipacionId,
    participantes: participantes.datos?.participantes ?? [],
    categorias: categorias.datos?.categorias ?? [],
    cargandoDatos: participantes.cargando || categorias.cargando,
    recargarParticipantes: participantes.recargar,
    recargarCategorias: categorias.recargar,
    recargarLista,
  };

  async function guardarGrupo(datos) {
    await api.editarGrupo(grupoId, datos);
    grupo.recargar();
    recargarLista();
    setEditar(false);
    avisar('Cambios del grupo guardados');
  }

  return (
    <ContextoGrupo.Provider value={valor}>
      <div className="pagina pagina--grupo">
        <header className="cabecera-grupo">
          <div className="cabecera-grupo__texto">
            <Link to="/grupos" className="volver">
              <Icono nombre="flecha" /> Mis grupos
            </Link>
            <h1>{g.nombre}</h1>
            {g.descripcion && <p className="cabecera-grupo__descripcion">{g.descripcion}</p>}
            <p className="cabecera-grupo__meta">
              {valor.participantes.length} {valor.participantes.length === 1 ? 'integrante' : 'integrantes'}. Tu rol:{' '}
              {esAdmin ? 'administrador' : 'integrante'}.
            </p>
          </div>
          <div className="cabecera-grupo__acciones">
            {esAdmin && (
              <button type="button" className="boton boton--secundario" onClick={() => setEditar(true)}>
                <Icono nombre="editar" /> Editar grupo
              </button>
            )}
            {!enFormularioGasto && (
              <Link to={`/grupos/${grupoId}/gastos/nuevo`} className="boton boton--primario">
                <Icono nombre="mas" /> Registrar gasto
              </Link>
            )}
          </div>
        </header>

        <nav className="pestanas" aria-label="Secciones del grupo">
          <NavLink to={`/grupos/${grupoId}`} end>
            Saldos
          </NavLink>
          <NavLink to={`/grupos/${grupoId}/gastos`}>Gastos</NavLink>
          <NavLink to={`/grupos/${grupoId}/liquidaciones`}>Liquidaciones</NavLink>
          <NavLink to={`/grupos/${grupoId}/integrantes`}>Integrantes</NavLink>
          <NavLink to={`/grupos/${grupoId}/categorias`}>Categorías</NavLink>
        </nav>

        <div className="contenido-grupo">
          <Outlet />
        </div>
      </div>

      <Dialogo abierto={editar} alCerrar={() => setEditar(false)} titulo="Editar grupo">
        <FormularioGrupo inicial={g} alGuardar={guardarGrupo} alCancelar={() => setEditar(false)} textoBoton="Guardar cambios" />
      </Dialogo>
    </ContextoGrupo.Provider>
  );
}
