/** Iconos de trazo simple (24×24) dibujados para Quadro. */
const trazos = {
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  salir: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l4-4-4-4M14 12H4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alerta: 'M12 8v5M12 16.5v.01M10.3 3.9L2.6 17.3A2 2 0 004.3 20h15.4a2 2 0 001.7-2.7L13.7 3.9a2 2 0 00-3.4 0z',
  clip: 'M20 11.5l-7.8 7.8a5 5 0 01-7.1-7.1l8.5-8.5a3.3 3.3 0 014.7 4.7l-8.5 8.5a1.7 1.7 0 01-2.4-2.4l7.8-7.8',
  editar: 'M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4',
  papelera: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  flecha: 'M15 18l-6-6 6-6',
  filtro: 'M4 5h16l-6 7.5V19l-4-2v-4.5L4 5z',
  recibo: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6',
  grupo: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.9M15.5 3.1a3.5 3.5 0 010 6.8',
  pago: 'M3 7h18v10H3zM3 11h18M7 15h3',
};

export default function Icono({ nombre, className = 'boton__icono', titulo }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
    >
      {titulo && <title>{titulo}</title>}
      <path d={trazos[nombre]} />
    </svg>
  );
}
