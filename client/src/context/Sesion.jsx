import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/cliente.js';

const ContextoSesion = createContext(null);

/** Mantiene el usuario autenticado (HU-01) y escucha cuando la sesión expira. */
export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(undefined); // undefined = verificando

  useEffect(() => {
    api
      .perfil()
      .then(({ usuario }) => setUsuario(usuario))
      .catch(() => setUsuario(null));
    const alExpirar = () => setUsuario(null);
    window.addEventListener('quadro:sesion-expirada', alExpirar);
    return () => window.removeEventListener('quadro:sesion-expirada', alExpirar);
  }, []);

  const iniciar = useCallback(async (datos) => {
    const { usuario } = await api.login(datos);
    setUsuario(usuario);
  }, []);

  const registrar = useCallback(async (datos) => {
    const { usuario } = await api.registro(datos);
    setUsuario(usuario);
  }, []);

  const cerrar = useCallback(async () => {
    await api.logout().catch(() => {});
    setUsuario(null);
  }, []);

  return <ContextoSesion.Provider value={{ usuario, iniciar, registrar, cerrar }}>{children}</ContextoSesion.Provider>;
}

export const useSesion = () => useContext(ContextoSesion);
