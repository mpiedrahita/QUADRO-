import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/schibsted-grotesk';
import './styles/tokens.css';
import './styles/base.css';
import './styles/componentes.css';
import './styles/diseno.css';
import './styles/paginas.css';
import App from './App.jsx';
import { ProveedorSesion } from './context/Sesion.jsx';
import { ProveedorAvisos } from './components/Avisos.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorAvisos>
          <App />
        </ProveedorAvisos>
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>
);
