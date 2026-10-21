// Versión lineal y minimalista del sello de la Fundación de Altos Estudios en Ciencias Comerciales.
// withText agrega el nombre en arco (solo se lee bien en tamaños grandes).
export function FundacionLogo({ size = 40, withText = false, color = 'currentColor', bg = 'none' }) {
  const id = `arc-${size}-${withText ? 't' : 'n'}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Fundación de Altos Estudios en Ciencias Comerciales">
      <circle cx="50" cy="50" r="48" fill={bg} stroke={color} strokeWidth={withText ? 1.6 : 3} />
      {withText && (
        <>
          <defs>
            <path id={id} d="M 31 82.9 A 38 38 0 1 1 69 82.9" />
          </defs>
          <text fill={color} fontSize="5.6" fontWeight="700" letterSpacing="0.1" textAnchor="middle" fontFamily="Inter Variable, Inter, sans-serif">
            <textPath href={`#${id}`} startOffset="50%">FUNDACIÓN DE ALTOS ESTUDIOS EN CIENCIAS COMERCIALES</textPath>
          </text>
          <circle cx="50" cy="50" r="31" fill="none" stroke={color} strokeWidth="1.4" />
        </>
      )}
      <g
        fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round"
        strokeWidth={withText ? 1.6 : 3.2}
        transform={withText ? 'translate(50 51) scale(0.72) translate(-50 -51)' : undefined}
      >
        {/* bastón y esfera */}
        <circle cx="50" cy="23" r="4" />
        <path d="M50 27 V82" />
        {/* alas */}
        <path d="M47 40 C40 31 28 30 18 42 C26 40 31 42 36 46 C41 48 45 48 47 46" />
        <path d="M44 37 C37 34 30 35 25 39" />
        <path d="M53 40 C60 31 72 30 82 42 C74 40 69 42 64 46 C59 48 55 48 53 46" />
        <path d="M56 37 C63 34 70 35 75 39" />
        {/* libro abierto */}
        <path d="M50 60 C44 56 36 56 29 58 V72 C36 70 44 70 50 74 C56 70 64 70 71 72 V58 C64 56 56 56 50 60" />
        <path d="M26 76 H74" />
      </g>
    </svg>
  )
}

export function CompanyMark({ size = 34 }) {
  return (
    <div className="brand-mark" style={{ width: size, height: size }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 20V9l9-5 9 5v11" />
        <path d="M7 20v-6h10v6" />
        <path d="M7 17h10" />
      </svg>
    </div>
  )
}
