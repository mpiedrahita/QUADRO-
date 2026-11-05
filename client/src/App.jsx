import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSesion } from './context/Sesion.jsx';
import { Cargando } from './components/Estados.jsx';
import Marco from './components/Marco.jsx';
import Acceso from './pages/Acceso.jsx';
import MisGrupos from './pages/MisGrupos.jsx';
import Grupo from './pages/grupo/Grupo.jsx';
import Saldos from './pages/grupo/Saldos.jsx';
import Gastos from './pages/grupo/Gastos.jsx';
import FormularioGasto from './pages/grupo/FormularioGasto.jsx';
import Liquidaciones from './pages/grupo/Liquidaciones.jsx';
import Integrantes from './pages/grupo/Integrantes.jsx';
import Categorias from './pages/grupo/Categorias.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';

/** RNF-01: las páginas privadas redirigen a "Ingresar" si no hay sesión. */
function Privado({ children }) {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  if (usuario === undefined) return <Cargando texto="Verificando tu sesión…" />;
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />;
  return children;
}

export default function App() {
  const { usuario } = useSesion();
  if (usuario === undefined) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <Cargando texto="Abriendo Quadro…" />
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate to={usuario ? '/grupos' : '/ingresar'} replace />} />
      <Route path="/ingresar" element={<Acceso modo="ingresar" />} />
      <Route path="/registro" element={<Acceso modo="registro" />} />
      <Route
        element={
          <Privado>
            <Marco />
          </Privado>
        }
      >
        <Route path="/grupos" element={<MisGrupos />} />
        <Route path="/grupos/:grupoId" element={<Grupo />}>
          <Route index element={<Saldos />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="gastos/nuevo" element={<FormularioGasto />} />
          <Route path="gastos/:gastoId/editar" element={<FormularioGasto />} />
          <Route path="liquidaciones" element={<Liquidaciones />} />
          <Route path="integrantes" element={<Integrantes />} />
          <Route path="categorias" element={<Categorias />} />
        </Route>
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
