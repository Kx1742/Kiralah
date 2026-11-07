/* Flat, hand-drawn sea creatures. Decorative only, so hidden from screen readers. */

type Props = { className?: string };

const svgProps = { "aria-hidden": true, focusable: false } as const;

export function Waves({ className }: Props) {
  return (
    <svg
      {...svgProps}
      className={className}
      viewBox="0 0 800 120"
      preserveAspectRatio="none"
    >
      <path
        fill="#a9d0f2"
        d="M0 46C90 18 170 20 262 44s170 26 268 2 180-26 270 2v72H0Z"
      />
      <path
        fill="#6fb0ea"
        d="M0 72c110-30 190-22 290 2s190 16 290-8 150-14 220 6v48H0Z"
      />
      <path
        fill="#eef3f7"
        d="M0 98c120-24 220-14 330 2s210 8 300-6 120-6 170 4v22H0Z"
      />
    </svg>
  );
}

export function Boat({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 200 92">
      <path fill="#c8401a" d="M86 6h20l4 26H82Z" />
      <path fill="#0f2b52" d="M86 6h20l1 7H85Z" />
      <path fill="#dcebf3" d="M46 32h110l10 24H34Z" />
      <path fill="#2f7ed8" d="M50 40h100v5H50Z" />
      <path fill="#f2b872" d="M62 50h20v8H62Zm30 0h20v8H92Zm30 0h20v8h-20Z" />
      <path fill="#0f2b52" d="M6 56h188l-22 34H26Z" />
      <circle cx="44" cy="70" r="3" fill="#8fd8c9" />
      <circle cx="62" cy="70" r="3" fill="#8fd8c9" />
      <circle cx="80" cy="70" r="3" fill="#8fd8c9" />
      <circle cx="98" cy="70" r="3" fill="#8fd8c9" />
      <circle cx="116" cy="70" r="3" fill="#8fd8c9" />
      <circle cx="134" cy="70" r="3" fill="#8fd8c9" />
      <circle cx="152" cy="70" r="3" fill="#8fd8c9" />
    </svg>
  );
}

export function Jellyfish({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 80 120">
      <path
        fill="#a48be6"
        d="M10 42C10 18 24 6 40 6s30 12 30 36c-10 6-50 6-60 0Z"
      />
      <path
        fill="none"
        stroke="#d9cdf8"
        strokeWidth="2"
        strokeLinecap="round"
        d="M22 16v14m10-20v18m10-18v18m10-14v14"
      />
      <path
        fill="none"
        stroke="#a9d0f2"
        strokeWidth="4"
        strokeLinecap="round"
        d="M20 48c-6 16 6 22 0 38s4 18 0 28M34 50c-4 18 6 24 2 40M48 50c4 16-6 26 0 44M60 48c6 14-6 22 0 36"
      />
      <path
        fill="none"
        stroke="#8fd8c9"
        strokeWidth="3"
        strokeLinecap="round"
        d="M27 50c-2 12 3 18 0 30m26-30c2 12-3 22 1 32"
      />
    </svg>
  );
}

export function Fish({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 80 36">
      <path fill="#8fd8c9" d="M4 18C16 4 42 2 60 18 42 34 16 32 4 18Z" />
      <path fill="#4c9a4f" d="m58 18 18-13-4 13 4 13Z" />
      <path
        fill="none"
        stroke="#2f7ed8"
        strokeWidth="2.5"
        d="M28 8c5 6 5 14 0 20m11-19c4 6 4 12 0 18"
      />
      <circle cx="16" cy="16" r="2.5" fill="#0f2b52" />
    </svg>
  );
}

export function Starfish({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 48 48">
      <path
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinejoin="round"
        d="m24 4 5 14 15 1-12 9 5 15-13-9-13 9 5-15L4 19l15-1Z"
      />
    </svg>
  );
}

export function Seaweed({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 90 170">
      <path
        fill="#4c9a4f"
        d="M20 170C4 140 28 124 14 96S20 44 34 26c8 28-8 42 4 68s-2 50 8 76Z"
      />
      <path
        fill="#6fbf6d"
        d="M48 170c-12-24 14-38 4-62s6-38 18-52c6 22-6 34 2 56s-4 38 2 58Z"
      />
    </svg>
  );
}

/* A message in a bottle: the link you share with friends. */
export function Bottle({ className }: Props) {
  return (
    <svg {...svgProps} className={className} viewBox="0 0 60 120">
      <rect x="22" y="2" width="16" height="14" rx="4" fill="#f2b872" />
      <path
        fill="#ffffff"
        fillOpacity=".35"
        d="M22 16h16v14c0 8 14 12 14 26v50c0 7-5 12-12 12H20c-7 0-12-5-12-12V56c0-14 14-18 14-26Z"
      />
      <path fill="#ffffff" d="M18 58h24v44H18z" transform="rotate(8 30 80)" />
      <path
        stroke="#1548a8"
        strokeWidth="2.5"
        strokeLinecap="round"
        d="m23 68 15 2m-16 8 15 2m-16 8 10 1.5"
      />
    </svg>
  );
}
