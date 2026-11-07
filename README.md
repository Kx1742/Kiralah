# SplitLah 🍛

Split makan bills fairly, straight from WhatsApp. No app, no sign-up, just a link.

> Work in progress. Working name: check domain, GitHub and app stores before launch.

## Run it locally

Needs Node 24 (`.nvmrc`) and pnpm (`corepack enable`).

```bash
pnpm install
cp .env.example apps/web/.env
docker compose up -d
pnpm db:deploy
pnpm dev
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Deploy

1. **Neon:** create a project (Singapore region is closest), and copy the pooled and direct connection strings.
2. **Vercel:** import the GitHub repo and set Root Directory to `apps/web`.
3. Add `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) as environment variables.
4. Set the Build Command to `pnpm db:deploy && pnpm build`.
5. Open `/api/health`: it should say `{"status":"ok","db":"up"}`.
