import { Link } from 'react-router-dom';
import { Vacio } from '../components/Estados.jsx';

export default function NoEncontrado() {
  return (
    <div className="pagina">
      <Vacio
        titulo="Esta página no existe"
        accion={
          <Link to="/grupos" className="boton boton--primario">
            Ir a mis grupos
          </Link>
        }
      >
        Revisa la dirección o vuelve a tus grupos.
      </Vacio>
    </div>
  );
}
