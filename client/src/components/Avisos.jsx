import { createContext, useCallback, useContext, useState } from 'react';
import Icono from './Icono.jsx';

const ContextoAvisos = createContext(() => {});

/** Avisos breves que confirman una acción ("Gasto registrado") o informan un error. */
export function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([]);

  const avisar = useCallback((texto, tipo = 'exito') => {
    const id = crypto.randomUUID();
    setAvisos((lista) => [...lista, { id, texto, tipo }]);
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), 4200);
  }, []);

  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso ${a.tipo === 'error' ? 'aviso--error' : ''}`}>
            <Icono nombre={a.tipo === 'error' ? 'alerta' : 'check'} className="aviso__icono" />
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

export const useAvisos = () => useContext(ContextoAvisos);
