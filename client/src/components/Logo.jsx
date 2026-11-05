/**
 * Logotipo tipográfico de Quadro.
 * La marca es una "Q" construida como un cuadro (el libro de cuentas) cuya cola
 * es un bloque ámbar que sobresale: la cuenta que falta por cuadrar.
 * La palabra se compone en Schibsted Grotesk extra negrita con interletrado cerrado.
 */
export function MarcaQuadro({ fondo = 'var(--marfil)', color = 'var(--verde-profundo)', className = 'logo__marca', titulo }) {
  return (
    <svg className={className} viewBox="0 0 40 40" role={titulo ? 'img' : undefined} aria-hidden={titulo ? undefined : true}>
      {titulo && <title>{titulo}</title>}
      <rect x="2" y="2" width="31" height="31" rx="7" fill={color} />
      <rect x="10" y="10" width="15" height="15" rx="2.5" fill={fondo} />
      <rect x="22.5" y="22.5" width="15.5" height="15.5" rx="3.5" fill="var(--ambar)" stroke={fondo} strokeWidth="2.5" />
    </svg>
  );
}

export default function Logo({ fondo, claro = false, tamano = 18, ...props }) {
  return (
    <span className="logo" style={{ fontSize: tamano, color: claro ? 'var(--en-oscuro)' : 'var(--verde-profundo)' }} {...props}>
      <MarcaQuadro
        fondo={fondo ?? (claro ? 'var(--verde-profundo)' : 'var(--marfil)')}
        color={claro ? 'var(--en-oscuro)' : 'var(--verde-profundo)'}
      />
      <span className="logo__palabra">Quadro</span>
    </span>
  );
}
