import { MarcaQuadro } from './Logo.jsx';

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status">
      <MarcaQuadro className="cargando__marca" />
      <span>{texto}</span>
    </div>
  );
}

export function Vacio({ titulo, children, accion }) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
      {accion}
    </div>
  );
}

export function ErrorCarga({ error, alReintentar }) {
  return (
    <div className="alerta alerta--error" role="alert">
      <div style={{ display: 'grid', gap: 8 }}>
        <span>{Object.values(error?.campos ?? {})[0] ?? error?.message ?? 'No fue posible cargar la información.'}</span>
        {alReintentar && (
          <button type="button" className="boton boton--secundario boton--pequeno" onClick={alReintentar} style={{ justifySelf: 'start' }}>
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
