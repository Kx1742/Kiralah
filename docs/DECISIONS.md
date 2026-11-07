# Decisions

Why SplitLah is built the way it is. Newest thinking wins; update this file when a decision changes.

## Node 24 LTS

The project pins Node 24 (`.nvmrc`, `engines`). Current ESLint, Vitest and lint-staged no longer run on older odd-numbered releases, and Vercel and CI both offer 24.

## Language in a cookie, not in the URL

`localePrefix: "never"`. A bill link is the same for everyone (`/b/x7Kp2`), stays short in WhatsApp, and opens in each friend's own language. Order: saved cookie, then the phone's `Accept-Language`, then English. The cost is no per-language URLs for search engines, which does not matter: bills are private and the home page is the only page worth indexing.

## Prisma 7 with the `pg` driver adapter

The connection is made lazily on first query, so `next build` never needs a database. At runtime `DATABASE_URL` is Neon's pooled string; migrations use `DIRECT_URL`, because migrations must not go through a transaction pooler.

## Design system

Taken from two references: a deep watercolour sea with brush lettering and playful sea creatures, and a pale paper page with layered flat waves, a flat ship and white rounded cards.

- **Home** is the sea. **Inner screens** are pale paper (`foam`) with waves and white cards, because forms need quiet.
- **Coral means the one main action** on a screen. Nothing else uses it.
- **Brush font only for the brand and big numbers.** Everything else is Nunito, which stays readable on small screens. Chinese uses the phone's system font: a CJK web font would be several megabytes on slow data.
- **Illustrations are inline SVG and the sea is CSS gradients**: no image downloads. Motion stops under `prefers-reduced-motion`.
