/* Flat kopitiam drawings. Decorative only, so hidden from screen readers. */

type Props = { className?: string };

const svgProps = { "aria-hidden": true, focusable: false } as const;

const louvers = (top: number, count: number) =>
  Array.from({ length: count }, (_, i) => `M8 ${top + i * 8}h54`).join("");

export function Awning({ className }: Props) {
  return (
    <svg {...svgProps} className={className}>
      <defs>
        <pattern
          id="awning-stripes"
          width="56"
          height="36"
          patternUnits="userSpaceOnUse"
        >
          <path fill="#b3301c" d="M0 0h28v24a14 12 0 0 1-28 0Z" />
          <path fill="#f8f1e3" d="M28 0h28v24a14 12 0 0 1-28 0Z" />
          <path fill="#8f2413" d="M0 0h28v5H0Z" />
          <path fill="#ddd2bb" d="M28 0h28v5H28Z" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#awning-stripes)" />
    </svg>
  );
}

export function Lamp({ className, lit }: Props & { lit: boolean }) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 60 92">
      <path stroke="#2b1d14" strokeWidth="2" d="M30 0v42" />
      {lit && (
        <ellipse
          cx="30"
          cy="80"
          rx="20"
          ry="9"
          fill="#ffe9a8"
          fillOpacity=".35"
        />
      )}
      <ellipse
        cx="30"
        cy="76"
        rx="13"
        ry="6"
        fill={lit ? "#ffe9a8" : "#6b6b5c"}
      />
      <path fill="#c99a5b" d="M6 74c0-20 11-34 24-34s24 14 24 34Z" />
      <path
        fill="none"
        stroke="#8a5a33"
        strokeWidth="1.5"
        d="M30 40v34M19 44c-4 8-5 20-5 30M41 44c4 8 5 20 5 30M12 56h36M8 66h44"
      />
      <ellipse cx="30" cy="74" rx="24" ry="3.5" fill="#8a5a33" />
    </svg>
  );
}

/* Seen from below: a spinning disc squashed flat reads as a ceiling fan. */
export function Fan({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 100 36">
      <path stroke="#2b1d14" strokeWidth="3" d="M50 0v18" />
      <g transform="translate(50 20) scale(1 .22)">
        <g className="animate-fan" fill="#5b3a1e">
          <path d="M-5 0C-8-20-6-44 0-46s8 26 5 46Z" />
          <path d="M-5 0C-8-20-6-44 0-46s8 26 5 46Z" transform="rotate(120)" />
          <path d="M-5 0C-8-20-6-44 0-46s8 26 5 46Z" transform="rotate(240)" />
        </g>
      </g>
      <rect x="44" y="15" width="12" height="9" rx="3" fill="#c99a5b" />
    </svg>
  );
}

export function WindowView({ className }: Props) {
  return (
    <svg
      {...svgProps}
      className={className}
      viewBox="0 0 70 220"
      preserveAspectRatio="none"
    >
      <rect width="70" height="220" fill="#bfe3f2" />
      <circle cx="46" cy="44" r="13" fill="#ffe9a8" />
      <path fill="#f8f1e3" d="M0 120l14-16 14 16v100H0Z" />
      <path fill="#c4693f" d="M0 122l14-22 14 22h-5l-9-13-9 13Z" />
      <path fill="#e7c9a0" d="M28 146h42v74H28Z" />
      <path fill="#c4693f" d="M24 148l23-18 23 14v6H24Z" />
      <path
        fill="#0e5a4a"
        d="M36 162h8v14h-8Zm16 0h8v14h-8ZM36 186h8v14h-8Zm16 0h8v14h-8Z"
      />
      <path
        fill="none"
        stroke="#2f8f5b"
        strokeWidth="3"
        d="M2 0c8 18-2 28 4 44s2 22 0 34"
      />
      <rect
        width="70"
        height="220"
        fill="none"
        stroke="#8a5a33"
        strokeWidth="6"
      />
    </svg>
  );
}

export function Shutter({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 70 220">
      <rect width="70" height="220" rx="4" fill="#6fbb9f" />
      <rect x="8" y="8" width="54" height="96" fill="#a7dcc6" />
      <rect x="8" y="116" width="54" height="96" fill="#a7dcc6" />
      <path
        fill="none"
        stroke="#6fbb9f"
        strokeWidth="2.5"
        d={`${louvers(16, 11)}${louvers(124, 11)}`}
      />
      <circle cx="62" cy="110" r="3.5" fill="#e3b23c" />
    </svg>
  );
}

export function MenuBoard({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 110 130">
      <path stroke="#2b1d14" strokeWidth="2" d="M55 0 20 16M55 0l35 16" />
      <rect x="4" y="14" width="102" height="112" rx="5" fill="#8a5a33" />
      <rect x="11" y="21" width="88" height="98" rx="3" fill="#1d1712" />
      <path
        fill="none"
        stroke="#f8f1e3"
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M22 36c8-3 14 3 22 0s8-1 14 0M22 54c6-2 10 2 16 0m32 0h14M22 70c6-2 12 2 18 0m30 0h14M22 86c6-2 8 2 14 0m34 0h14M22 102c8-2 12 2 20 0m28 0h14"
      />
    </svg>
  );
}

export function Birdcage({ className }: Props) {
  return (
    <svg
      {...svgProps}
      className={`origin-top ${className}`}
      viewBox="0 0 60 110"
    >
      <path stroke="#2b1d14" strokeWidth="2" d="M30 0v22" />
      <path
        fill="none"
        stroke="#c99a5b"
        strokeWidth="2"
        d="M6 100V52C6 34 18 22 30 22s24 12 24 30v48M18 100V34M30 100V22M42 100V34"
      />
      <path
        fill="#e3b23c"
        d="M23 72c0-6 5-10 10-10 3 0 5 2 6 5l5 1-5 2c0 7-4 10-9 10-4 0-7-3-7-8Z"
      />
      <circle cx="35" cy="67" r="1.2" fill="#2b1d14" />
      <path stroke="#8a5a33" strokeWidth="3" d="M16 82h28" />
      <rect x="3" y="100" width="54" height="6" rx="2" fill="#8a5a33" />
    </svg>
  );
}

export function Chair({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 60 110">
      <path
        fill="none"
        stroke="#5b3a1e"
        strokeWidth="5"
        strokeLinecap="round"
        d="M14 62V20C14 8 46 8 46 20v42M23 16v46M37 16v46M14 62l-6 46M46 62l6 46M11 88h38"
      />
      <ellipse cx="30" cy="62" rx="24" ry="6" fill="#c99a5b" />
      <path
        fill="none"
        stroke="#8a5a33"
        strokeWidth="1"
        d="M12 62h36M18 58l24 8M42 58l-24 8"
      />
    </svg>
  );
}

export function Plant({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 70 110">
      <path fill="#2f8f5b" d="M34 72C18 62 6 44 8 18c16 10 28 30 28 54Z" />
      <path fill="#57b37a" d="M36 72c14-10 26-26 26-50-16 8-28 26-26 50Z" />
      <path fill="#3fa36b" d="M35 72C28 50 28 24 36 2c8 22 8 48-1 70Z" />
      <path
        fill="none"
        stroke="#1d6b42"
        strokeWidth="1.2"
        d="M34 68C24 54 16 40 12 26M36 68c8-12 16-24 22-40M35 66c-1-20 0-40 1-58"
      />
      <path fill="#c4693f" d="M14 70h42l-6 40H20Z" />
      <path fill="#f8f1e3" fillOpacity=".5" d="M19 86h32l-1 5H20Z" />
      <rect x="11" y="66" width="48" height="9" rx="2" fill="#a9532e" />
    </svg>
  );
}

/* Kopitiam cat, asleep until you pet it. */
export function Cat({
  className,
  awake,
  wagging,
}: Props & { awake: boolean; wagging: boolean }) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 70 44">
      <path
        className={wagging ? "animate-wag" : undefined}
        style={{ transformOrigin: "56px 34px" }}
        fill="none"
        stroke="#d9822b"
        strokeWidth="6"
        strokeLinecap="round"
        d="M54 34c10 2 14-4 11-13"
      />
      <path fill="#e8983f" d="M12 42c-2-16 10-24 24-24s22 10 22 24Z" />
      <path
        fill="none"
        stroke="#b96a1d"
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M34 20v8M42 21v8M50 26v7"
      />
      <path
        fill="#e8983f"
        d="M3 14 6 2l8 6h8l8-6 3 12c1 10-6 18-15 18S2 24 3 14Z"
      />
      <path fill="#f6c9a8" d="m7 7 1-1 4 3-4 2Zm22 0-1-1-4 3 4 2Z" />
      {awake ? (
        <path fill="#2b1d14" d="M11 15h3v4h-3Zm11 0h3v4h-3Z" />
      ) : (
        <path
          fill="none"
          stroke="#2b1d14"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M9 17c2 2 4 2 6 0m6 0c2 2 4 2 6 0"
        />
      )}
      <path fill="#b3301c" d="M16.5 21.5h3l-1.5 2Z" />
    </svg>
  );
}

export function TableTop({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 320 150">
      <rect x="152" y="84" width="16" height="56" fill="#2b1d14" />
      <path
        fill="#2b1d14"
        d="M152 112c-6 14-24 24-44 30h104c-20-6-38-16-44-30Z"
      />
      <ellipse cx="160" cy="143" rx="52" ry="6" fill="#2b1d14" />
      <ellipse cx="160" cy="79" rx="152" ry="20" fill="#5b3a1e" />
      <ellipse cx="160" cy="76" rx="152" ry="20" fill="#8a5a33" />
      <ellipse cx="160" cy="72" rx="152" ry="20" fill="#fffdf8" />
      <path
        fill="none"
        stroke="#cfc8ba"
        strokeWidth="1.5"
        d="M30 74c30 8 50-2 80 6s34-4 52 0M190 84c30-6 40 2 70-6M130 60c20 6 30-2 50 2s26 6 40 2M60 62c10 2 16-2 26 0"
      />
    </svg>
  );
}

export function KopiCup({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 92 84">
      <g
        className="animate-steam"
        fill="none"
        stroke="#f8f1e3"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M34 26c-5-6 5-11 0-18M54 26c-5-6 5-11 0-18" />
      </g>
      <ellipse
        cx="46"
        cy="72"
        rx="42"
        ry="10"
        fill="#ffffff"
        stroke="#0e5a4a"
        strokeWidth="2"
      />
      <ellipse cx="46" cy="72" rx="28" ry="6" fill="#e6f2ec" />
      <path
        fill="none"
        stroke="#0e5a4a"
        strokeWidth="5"
        d="M70 42c14-2 16 16-5 20"
      />
      <path
        fill="#ffffff"
        stroke="#0e5a4a"
        strokeWidth="2"
        d="M20 34h52l-6 34a6 6 0 0 1-6 5H32a6 6 0 0 1-6-5Z"
      />
      <path fill="#0e5a4a" d="M22 45h48l-1.2 6H23.2Z" />
      <path
        fill="#e3b23c"
        d="M30 48a1.6 1.6 0 1 0 0-.1Zm12 0a1.6 1.6 0 1 0 0-.1Zm12 0a1.6 1.6 0 1 0 0-.1Zm8 0a1.6 1.6 0 1 0 0-.1Z"
      />
      <ellipse cx="46" cy="34" rx="26" ry="5" fill="#3a2212" />
      <path
        fill="none"
        stroke="#7a4a24"
        strokeWidth="1.5"
        d="M34 34c6-2 14 2 22-1"
      />
    </svg>
  );
}

export function TehTarik({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 48 92">
      <path fill="#c98b4f" d="M4 6h40l-6 78a5 5 0 0 1-5 4H15a5 5 0 0 1-5-4Z" />
      <path
        fill="#a96f38"
        d="M9 66h30l-1.4 18a5 5 0 0 1-5 4H15.400a5 5 0 0 1-5-4Z"
      />
      <path fill="#f5e6cf" d="M4 6h40l-1.200 16H5.200Z" />
      <circle cx="14" cy="14" r="3" fill="#fffdf8" />
      <circle cx="25" cy="11" r="4" fill="#fffdf8" />
      <circle cx="35" cy="15" r="2.500" fill="#fffdf8" />
      <path fill="#ffffff" fillOpacity=".4" d="M11 26h5l2 54h-4Z" />
    </svg>
  );
}

export function KayaToast({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 100 64">
      <ellipse
        cx="50"
        cy="54"
        rx="48"
        ry="9"
        fill="#ffffff"
        stroke="#cfc8ba"
        strokeWidth="2"
      />
      <path
        fill="#d99a4e"
        stroke="#8a5a33"
        strokeWidth="2"
        d="m16 50 30-38 30 38Z"
      />
      <path fill="#8fa33c" d="m26 50 20-25 20 25Z" />
      <path fill="#fff4d6" d="m33 50 13-16 13 16Z" />
      <path
        fill="#e8b36a"
        stroke="#8a5a33"
        strokeWidth="2"
        d="m30 56 30-36 30 36Z"
      />
      <path fill="#8fa33c" d="m42 53 18-22 18 22Z" />
      <path fill="#fff4d6" d="m50 53 10-12 10 12Z" />
    </svg>
  );
}

/* The bill: one line turns red for each dish picked. */
export function Receipt({ className, ticks }: Props & { ticks: number }) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 44 84">
      <g transform="rotate(5 22 42)">
        <path
          fill="#ffffff"
          stroke="#cfc8ba"
          strokeWidth="1.5"
          d="M5 8l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4v70H5Z"
        />
        {[24, 36, 48].map((y, i) => (
          <path
            key={y}
            stroke={i < ticks ? "#b3301c" : "#5f4d3f"}
            strokeWidth="2.500"
            strokeLinecap="round"
            d={`M11 ${y}h14m5 0h4`}
          />
        ))}
        <path
          stroke="#b3301c"
          strokeWidth="3"
          strokeLinecap="round"
          d="M11 64h23"
        />
      </g>
    </svg>
  );
}
