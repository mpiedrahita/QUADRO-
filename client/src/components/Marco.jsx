import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icono from './Icono.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { ProveedorGrupos, useGrupos } from '../context/Grupos.jsx';
import { formatoSaldo, iniciales } from '../utils/formato.js';

function MenuLateral({ alNavegar }) {
  const { usuario, cerrar } = useSesion();
  const { grupos, cargando } = useGrupos();
  return (
    <div className="lateral__contenido">
      <Link to="/grupos" className="lateral__logo" onClick={alNavegar} aria-label="Quadro, ir a mis grupos">
        <Logo claro tamano={19} />
      </Link>

      <nav aria-label="Grupos" className="lateral__nav">
        <NavLink to="/grupos" end className="lateral__enlace lateral__enlace--titulo" onClick={alNavegar}>
          Mis grupos
        </NavLink>
        {cargando && grupos.length === 0 ? (
          <p className="lateral__nota">Cargando grupos…</p>
        ) : grupos.length === 0 ? (
          <p className="lateral__nota">Todavía no perteneces a ningún grupo.</p>
        ) : (
          <ul className="lateral__grupos">
            {grupos.map((g) => (
              <li key={g.id}>
                <NavLink to={`/grupos/${g.id}`} className="lateral__enlace" onClick={alNavegar}>
                  <span className="lateral__grupo-nombre">{g.nombre}</span>
                  <span className={`lateral__grupo-saldo cifra ${g.miSaldo < 0 ? 'es-debe' : ''}`}>{formatoSaldo(g.miSaldo)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
        <Link to="/grupos?crear=1" className="lateral__crear" onClick={alNavegar}>
          <Icono nombre="mas" /> Crear grupo
        </Link>
      </nav>

      <div className="lateral__usuario">
        <span className="avatar avatar--oscuro" aria-hidden="true">
          {iniciales(usuario?.nombre)}
        </span>
        <span className="lateral__usuario-datos">
          <strong>{usuario?.nombre}</strong>
          <span>{usuario?.correo}</span>
        </span>
        <button type="button" className="lateral__salir" onClick={cerrar} aria-label="Cerrar sesión" title="Cerrar sesión">
          <Icono nombre="salir" />
        </button>
      </div>
    </div>
  );
}

/** Estructura de la aplicación autenticada: menú lateral en escritorio y cajón en celular. */
export default function Marco() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ubicacion = useLocation();
  useEffect(() => setMenuAbierto(false), [ubicacion.pathname]);

  return (
    <ProveedorGrupos>
      <a href="#contenido" className="saltar-contenido">
        Saltar al contenido
      </a>
      <div className="marco">
        <header className="barra-movil">
          <Link to="/grupos" aria-label="Quadro, ir a mis grupos">
            <Logo claro tamano={17} />
          </Link>
          <button
            type="button"
            className="barra-movil__menu"
            aria-expanded={menuAbierto}
            aria-controls="menu-lateral"
            onClick={() => setMenuAbierto((v) => !v)}
          >
            <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} />
            <span className="solo-lectores">Menú</span>
          </button>
        </header>
        <aside id="menu-lateral" className={`lateral ${menuAbierto ? 'lateral--abierto' : ''}`}>
          <MenuLateral alNavegar={() => setMenuAbierto(false)} />
        </aside>
        {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}
        <main className="principal" id="contenido" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </ProveedorGrupos>
  );
}
