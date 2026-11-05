import { useCallback, useEffect, useState } from 'react';

/**
 * Ejecuta una consulta a la API y expone { datos, error, cargando, recargar }.
 * Ignora respuestas que lleguen después de que el componente cambió de consulta.
 */
export function useCarga(consulta, dependencias = []) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    consulta()
      .then((datos) => vigente && setEstado({ datos, error: null, cargando: false }))
      .catch((error) => vigente && setEstado({ datos: null, error, cargando: false }));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, recargar };
}
