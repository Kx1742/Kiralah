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
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#awning-stripes)" />
    </svg>
  );
}

export function Lamp({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 60 92">
      <path stroke="#2b1d14" strokeWidth="2" d="M30 0v42" />
      <ellipse cx="30" cy="76" rx="13" ry="6" fill="#ffe9a8" />
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
        d="M14 62V20C14 8 46 8 46 20v42M23 16v46M37 16v46M14 62l-6 46M46 62l6 46"
      />
      <ellipse cx="30" cy="62" rx="24" ry="6" fill="#c99a5b" />
    </svg>
  );
}

export function Plant({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 70 110">
      <path fill="#2f8f5b" d="M34 72C18 62 6 44 8 18c16 10 28 30 28 54Z" />
      <path fill="#57b37a" d="M36 72c14-10 26-26 26-50-16 8-28 26-26 50Z" />
      <path fill="#3fa36b" d="M35 72C28 50 28 24 36 2c8 22 8 48-1 70Z" />
      <path fill="#c4693f" d="M14 70h42l-6 40H20Z" />
      <rect x="11" y="66" width="48" height="9" rx="2" fill="#a9532e" />
    </svg>
  );
}

/* Marble table with kopi, teh tarik, kaya toast and the bill to split. */
export function TableScene({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 320 150">
      <rect x="152" y="84" width="16" height="56" fill="#2b1d14" />
      <ellipse cx="160" cy="143" rx="46" ry="7" fill="#2b1d14" />
      <ellipse cx="160" cy="78" rx="152" ry="20" fill="#8a5a33" />
      <ellipse cx="160" cy="72" rx="152" ry="20" fill="#fffdf8" />
      <path
        fill="none"
        stroke="#d9d3c7"
        strokeWidth="1.5"
        d="M30 74c30 8 50-2 80 6M190 84c30-6 40 2 70-6M130 62c20 6 30-2 50 2"
      />

      <g
        className="animate-steam"
        fill="none"
        stroke="#f8f1e3"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M60 28c-5-6 5-11 0-18M78 28c-5-6 5-11 0-18" />
      </g>
      <ellipse
        cx="69"
        cy="72"
        rx="33"
        ry="8"
        fill="#ffffff"
        stroke="#0e5a4a"
        strokeWidth="2"
      />
      <path
        fill="none"
        stroke="#0e5a4a"
        strokeWidth="4"
        d="M92 44c12-2 14 14-4 18"
      />
      <path
        fill="#ffffff"
        stroke="#0e5a4a"
        strokeWidth="2"
        d="M46 36h46l-5 30a6 6 0 0 1-6 5H57a6 6 0 0 1-6-5Z"
      />
      <path fill="#0e5a4a" d="M47.5 46h43l-1 6h-41Z" />
      <ellipse cx="69" cy="36" rx="23" ry="4.5" fill="#3a2212" />

      <path
        fill="#c98b4f"
        d="M122 14h34l-5 58a4 4 0 0 1-4 4h-16a4 4 0 0 1-4-4Z"
      />
      <path fill="#f5e6cf" d="M122 14h34l-1 13h-32Z" />
      <path fill="#ffffff" fillOpacity=".4" d="M128 30h5l2 40h-4Z" />

      <ellipse
        cx="207"
        cy="74"
        rx="38"
        ry="8"
        fill="#ffffff"
        stroke="#d9d3c7"
        strokeWidth="2"
      />
      <path
        fill="#d99a4e"
        stroke="#8a5a33"
        strokeWidth="2"
        d="M178 70l26-34 26 34Z"
      />
      <path fill="#b58a2a" d="M186 70l18-24 18 24Z" />
      <path
        fill="#e8b36a"
        stroke="#8a5a33"
        strokeWidth="2"
        d="M186 74l24-30 24 30Z"
      />

      <g transform="rotate(8 275 50)">
        <path
          fill="#ffffff"
          stroke="#d9d3c7"
          strokeWidth="1.5"
          d="M258 22l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4v54h-34Z"
        />
        <path
          stroke="#5f4d3f"
          strokeWidth="2"
          strokeLinecap="round"
          d="M264 36h14m4 0h4M264 45h14m4 0h4M264 54h14m4 0h4"
        />
        <path
          stroke="#b3301c"
          strokeWidth="3"
          strokeLinecap="round"
          d="M264 66h22"
        />
      </g>
    </svg>
  );
}
