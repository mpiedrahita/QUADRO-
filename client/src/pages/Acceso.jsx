import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { CampoTexto } from '../components/Campo.jsx';
import { useSesion } from '../context/Sesion.jsx';
import { formatoSaldo } from '../utils/formato.js';

/** HU-01 · RF-01, RF-02: registro e inicio de sesión. */
export default function Acceso({ modo }) {
  const esRegistro = modo === 'registro';
  const { usuario, iniciar, registrar } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [datos, setDatos] = useState({ nombre: '', correo: '', contrasena: '' });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verClave, setVerClave] = useState(false);

  if (usuario) return <Navigate to={ubicacion.state?.desde ?? '/grupos'} replace />;

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje('');
    try {
      if (esRegistro) await registrar(datos);
      else await iniciar({ correo: datos.correo, contrasena: datos.contrasena });
      navegar(ubicacion.state?.desde ?? '/grupos', { replace: true });
    } catch (error) {
      setErrores(error.campos ?? {});
      setMensaje(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <section className="acceso__marca" aria-labelledby="acceso-lema">
        <Logo claro tamano={20} />
        <div className="acceso__lema">
          <h1 id="acceso-lema">Cuadren las cuentas del emprendimiento.</h1>
          <p>Registren lo que paga cada integrante, repartan cada gasto y sepan quién le debe a quién sin hacer cuentas a mano.</p>
        </div>
        <figure className="acceso__ejemplo" aria-label="Ejemplo de saldos de un grupo">
          <figcaption>Así se ve un grupo después de una compra de $90.000 que pagó Ana</figcaption>
          {[
            ['Ana', 60000],
            ['Bruno', -30000],
            ['Carla', -30000],
          ].map(([nombre, valor]) => (
            <div key={nombre} className="acceso__fila">
              <span>{nombre}</span>
              <span className="acceso__barra">
                <span
                  className={valor > 0 ? 'acceso__barra-favor' : 'acceso__barra-debe'}
                  style={{ width: `${(Math.abs(valor) / 60000) * 50}%` }}
                />
              </span>
              <span className="cifra">{formatoSaldo(valor)}</span>
            </div>
          ))}
        </figure>
      </section>

      <main className="acceso__formulario" id="contenido">
        <div className="acceso__caja">
          <h2>{esRegistro ? 'Crea tu cuenta' : 'Ingresa a Quadro'}</h2>
          <p className="acceso__sub">
            {esRegistro ? '¿Ya tienes una cuenta? ' : '¿Aún no tienes cuenta? '}
            <Link to={esRegistro ? '/ingresar' : '/registro'}>{esRegistro ? 'Ingresa' : 'Regístrate gratis'}</Link>
          </p>

          {mensaje && (
            <div className="alerta alerta--error" role="alert">
              {mensaje}
            </div>
          )}

          <form className="formulario" onSubmit={enviar} noValidate>
            {esRegistro && (
              <CampoTexto etiqueta="Nombre" autoComplete="name" value={datos.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
            )}
            <CampoTexto
              etiqueta="Correo electrónico"
              type="email"
              autoComplete="email"
              value={datos.correo}
              onChange={cambiar('correo')}
              error={errores.correo}
            />
            <CampoTexto
              etiqueta="Contraseña"
              type={verClave ? 'text' : 'password'}
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              value={datos.contrasena}
              onChange={cambiar('contrasena')}
              error={errores.contrasena}
              ayuda={esRegistro ? 'Mínimo 8 caracteres, con al menos una letra y un número.' : undefined}
            />
            <label className="casilla">
              <input type="checkbox" checked={verClave} onChange={(e) => setVerClave(e.target.checked)} />
              Mostrar contraseña
            </label>
            <button type="submit" className="boton boton--primario boton--bloque" disabled={enviando}>
              {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
