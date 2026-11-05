import { createContext, useContext } from 'react';
import { api } from '../api/cliente.js';
import { useCarga } from '../hooks/useCarga.js';

const ContextoGrupos = createContext(null);

/** Lista de grupos del usuario, compartida por el menú lateral y la página "Mis grupos". */
export function ProveedorGrupos({ children }) {
  const { datos, error, cargando, recargar } = useCarga(() => api.grupos(), []);
  return (
    <ContextoGrupos.Provider value={{ grupos: datos?.grupos ?? [], error, cargando, recargar }}>{children}</ContextoGrupos.Provider>
  );
}

export const useGrupos = () => useContext(ContextoGrupos);
