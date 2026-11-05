import { useEffect, useRef } from 'react';
import Icono from './Icono.jsx';

/**
 * Diálogo modal basado en el elemento nativo <dialog>:
 * atrapa el foco, se cierra con Escape y devuelve el foco al elemento que lo abrió.
 */
export default function Dialogo({ abierto, alCerrar, titulo, descripcion, children, ancho = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={`dialogo ${ancho ? 'dialogo--ancho' : ''}`}
      aria-labelledby="dialogo-titulo"
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
    >
      {abierto && (
        <>
          <div className="dialogo__cabecera">
            <div>
              <h2 id="dialogo-titulo">{titulo}</h2>
              {descripcion && <p style={{ color: 'var(--grafito-suave)', marginTop: 4 }}>{descripcion}</p>}
            </div>
            <button type="button" className="dialogo__cerrar" onClick={alCerrar} aria-label="Cerrar">
              <Icono nombre="cerrar" />
            </button>
          </div>
          <div className="dialogo__cuerpo">{children}</div>
        </>
      )}
    </dialog>
  );
}

/** Confirmación para acciones que cambian saldos o retiran personas. */
export function DialogoConfirmar({ abierto, alCerrar, titulo, mensaje, textoConfirmar, alConfirmar, ocupado, peligro = true }) {
  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo={titulo}>
      <p>{mensaje}</p>
      <div className="dialogo__acciones">
        <button type="button" className="boton boton--secundario" onClick={alCerrar} disabled={ocupado}>
          Cancelar
        </button>
        <button
          type="button"
          className={`boton ${peligro ? 'boton--peligro-lleno' : 'boton--primario'}`}
          onClick={alConfirmar}
          disabled={ocupado}
        >
          {ocupado ? 'Procesando…' : textoConfirmar}
        </button>
      </div>
    </Dialogo>
  );
}
