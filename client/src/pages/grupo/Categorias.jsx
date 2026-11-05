import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useAvisos } from '../../components/Avisos.jsx';
import { CampoTexto } from '../../components/Campo.jsx';
import Dialogo, { DialogoConfirmar } from '../../components/Dialogo.jsx';
import { Cargando } from '../../components/Estados.jsx';
import Icono from '../../components/Icono.jsx';
import { useGrupo } from './Grupo.jsx';

/** HU-10 · RF-11: categorías para clasificar los gastos del grupo. */
export default function Categorias() {
  const { grupoId, categorias, esAdmin, recargarCategorias, cargandoDatos } = useGrupo();
  const avisar = useAvisos();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');
  const [porEliminar, setPorEliminar] = useState(null);

  async function crear(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const { categoria } = await api.crearCategoria(grupoId, nombre);
      avisar(`Categoría "${categoria.nombre}" creada`);
      setNombre('');
      recargarCategorias();
    } catch (err) {
      setError(err.campos?.nombre ?? err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function renombrar(e) {
    e.preventDefault();
    setErrorEdicion('');
    try {
      await api.renombrarCategoria(grupoId, editando.id, nuevoNombre);
      avisar('Categoría renombrada');
      setEditando(null);
      recargarCategorias();
    } catch (err) {
      setErrorEdicion(err.campos?.nombre ?? err.message);
    }
  }

  async function eliminar() {
    try {
      await api.eliminarCategoria(grupoId, porEliminar.id);
      avisar(`Categoría "${porEliminar.nombre}" eliminada`);
      recargarCategorias();
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setPorEliminar(null);
    }
  }

  return (
    <div className="dos-columnas">
      <section className="panel panel--lista" aria-labelledby="titulo-categorias">
        <div className="panel__titulo">
          <h2 id="titulo-categorias">Categorías</h2>
          <p>{categorias.length} en total</p>
        </div>
        {cargandoDatos && categorias.length === 0 ? (
          <Cargando />
        ) : (
          <ul className="lista">
            {categorias.map((c) => (
              <li key={c.id} className="categoria">
                <span className="categoria__nombre">
                  <strong>{c.nombre}</strong>
                  <span className="texto-suave">{c.usos === 0 ? 'Sin gastos' : `${c.usos} ${c.usos === 1 ? 'gasto' : 'gastos'}`}</span>
                </span>
                {esAdmin && (
                  <span className="categoria__acciones">
                    <button
                      type="button"
                      className="boton boton--fantasma boton--pequeno"
                      onClick={() => {
                        setEditando(c);
                        setNuevoNombre(c.nombre);
                        setErrorEdicion('');
                      }}
                    >
                      <Icono nombre="editar" /> Renombrar
                    </button>
                    {c.usos === 0 && (
                      <button
                        type="button"
                        className="boton boton--fantasma boton--pequeno"
                        onClick={() => setPorEliminar(c)}
                        aria-label={`Eliminar ${c.nombre}`}
                      >
                        <Icono nombre="papelera" />
                      </button>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {esAdmin ? (
        <section className="panel" aria-labelledby="titulo-nueva-categoria">
          <div className="panel__titulo">
            <h2 id="titulo-nueva-categoria">Nueva categoría</h2>
          </div>
          <form className="formulario" onSubmit={crear} noValidate>
            <CampoTexto
              etiqueta="Nombre"
              value={nombre}
              onChange={(e) => {
                setError('');
                setNombre(e.target.value);
              }}
              error={error}
              ayuda="Entre 2 y 40 caracteres. No puede repetirse en el grupo."
              placeholder="Ej.: Publicidad"
              maxLength={40}
            />
            <button type="submit" className="boton boton--primario" disabled={guardando}>
              <Icono nombre="mas" /> {guardando ? 'Creando…' : 'Crear categoría'}
            </button>
          </form>
          <p className="texto-suave" style={{ marginTop: 'var(--e-4)' }}>
            Las categorías con gastos no se pueden eliminar, pero sí renombrar.
          </p>
        </section>
      ) : (
        <section className="panel">
          <h2>Clasifica tus gastos</h2>
          <p className="texto-suave" style={{ marginTop: 'var(--e-2)' }}>
            Elige una de estas categorías al registrar un gasto. Si necesitas otra, pídesela al administrador del grupo.
          </p>
        </section>
      )}

      <Dialogo abierto={Boolean(editando)} alCerrar={() => setEditando(null)} titulo="Renombrar categoría">
        <form className="formulario" onSubmit={renombrar} noValidate>
          <CampoTexto etiqueta="Nombre" value={nuevoNombre} onChange={(e) => { setErrorEdicion(''); setNuevoNombre(e.target.value); }} error={errorEdicion} maxLength={40} autoFocus />
          <div className="dialogo__acciones">
            <button type="button" className="boton boton--secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button type="submit" className="boton boton--primario">
              Guardar cambios
            </button>
          </div>
        </form>
      </Dialogo>

      <DialogoConfirmar
        abierto={Boolean(porEliminar)}
        alCerrar={() => setPorEliminar(null)}
        titulo="¿Eliminar categoría?"
        mensaje={`"${porEliminar?.nombre}" dejará de estar disponible para nuevos gastos.`}
        textoConfirmar="Eliminar categoría"
        alConfirmar={eliminar}
      />
    </div>
  );
}
