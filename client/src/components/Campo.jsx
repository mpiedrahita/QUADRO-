import { useId } from 'react';
import { formatoMiles, leerPesos } from '../utils/formato.js';

/**
 * Campo de formulario accesible: etiqueta asociada, ayuda y error leídos por lectores
 * de pantalla (aria-describedby) y marca de inválido (RNF-05).
 */
export function Campo({ etiqueta, error, ayuda, opcional, children, className = '' }) {
  const id = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const control = children({
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': [idError, idAyuda].filter(Boolean).join(' ') || undefined,
    className: 'campo__control',
  });
  return (
    <div className={`campo ${className}`}>
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta} {opcional && <span className="campo__opcional">(opcional)</span>}
      </label>
      {control}
      {error && (
        <p className="campo__error" id={idError}>
          {error}
        </p>
      )}
      {ayuda && !error && (
        <p className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function CampoTexto({ etiqueta, error, ayuda, opcional, ...props }) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional}>
      {(attrs) => <input {...attrs} {...props} />}
    </Campo>
  );
}

export function CampoSelector({ etiqueta, error, ayuda, children, ...props }) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda}>
      {(attrs) => (
        <select {...attrs} {...props}>
          {children}
        </select>
      )}
    </Campo>
  );
}

/** Campo de pesos enteros: muestra separadores de miles mientras se escribe. */
export function CampoDinero({ etiqueta, error, ayuda, valor, alCambiar, ...props }) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} className="campo--dinero">
      {(attrs) => (
        <>
          <span className="campo__prefijo" aria-hidden="true">
            $
          </span>
          <input
            {...attrs}
            {...props}
            inputMode="numeric"
            autoComplete="off"
            value={valor === null || valor === undefined ? '' : formatoMiles(valor)}
            onChange={(e) => alCambiar(leerPesos(e.target.value))}
          />
        </>
      )}
    </Campo>
  );
}
