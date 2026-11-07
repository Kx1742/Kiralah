# Launch checklist

Everything here needs your own accounts, so it is done by you. Allow about an hour. All services used have free plans.

## 0. Check the name

The app is called **KiraLah** ("kira" means count or work out). It was first called SplitLah, but an iPhone app with that name already exists ([App Store](https://apps.apple.com/us/app/splitlah/id6758514741), 2026). Web searches in November 2026 found no app called KiraLah. Before buying a domain, confirm it properly:

- Search Malaysia's trademark register at MyIPO.
- Search the App Store and Google Play.
- Check that the domain you want (for example `kiralah.app` or `kiralah.my`) is available.

## 1. Fix commit authorship, then push to GitHub

Your commits currently have no author name. Set it, rewrite the existing commits with it, then push. This is safe only because nothing has been pushed yet.

```bash
git config --global user.name "Your Name"
git rebase -r --root --exec "git commit --amend --no-edit --reset-author"
```

Create an empty repository on GitHub (no README or licence), then:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

GitHub Actions runs lint, typecheck, unit tests and the browser tests on every push. Add the CI badge to the README:

```markdown
[![CI](https://github.com/<you>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<you>/<repo>/actions/workflows/ci.yml)
```

## 2. Database: Neon

1. Create a project at [neon.tech](https://neon.tech), in the **Singapore** region (closest to Malaysia). Vercel runs the server code in Singapore too (`regions` in `apps/web/vercel.json`), so the two sit side by side.
2. Copy two connection strings: the **pooled** one (host contains `-pooler`) and the **direct** one.

## 3. Hosting: Vercel

1. Import the GitHub repository at [vercel.com](https://vercel.com).
2. **Root Directory:** `apps/web`. Vercel detects pnpm and Next.js.
3. **Build Command:** `pnpm db:deploy && pnpm build`. This applies database migrations on every deploy.
4. **Environment variables:**

| Name                | Value                                                              |
| ------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`      | Neon's pooled connection string                                    |
| `DIRECT_URL`        | Neon's direct connection string                                    |
| `RATE_LIMIT_SALT`   | Any long random string                                             |
| `CRON_SECRET`       | Any long random string (Vercel Cron sends it to the daily cleanup) |
| `ANTHROPIC_API_KEY` | Optional: turns on receipt scanning                                |
| `RECEIPT_DAILY_CAP` | Optional: receipt scans per day for everyone (default 200)         |

5. Deploy. The daily cleanup in `apps/web/vercel.json` is picked up automatically.

## 4. Short URL

Buy the domain for your chosen name (for example `.app` or `.my`) and add it under Vercel → Project → Domains. Shorter is better, since it appears in every WhatsApp message.

## 5. Check it works

- [ ] `https://<your-domain>/api/health` says `{"status":"ok","db":"up"}`.
- [ ] Make a bill, share it to yourself on WhatsApp, and check that the link preview shows the image, restaurant and total.
- [ ] Open the link on a second phone and pick dishes; the first phone updates within a few seconds.
- [ ] Vercel → Project → Settings → Cron Jobs lists `/api/cron/cleanup`.
- [ ] Lighthouse (Chrome DevTools → Lighthouse → Mobile) scores 90+ for Performance and Accessibility on `/`, `/new` and a bill page. Put the scores in the README.
- [ ] With `ANTHROPIC_API_KEY` set locally, run `pnpm eval` and put the accuracy in the README. Add real receipts to `evals/receipts/` first; see `evals/README.md`.

## 6. After launch

- Run the usability test in [USABILITY.md](USABILITY.md) with 3 friends, and fill in the README's findings.
- After a few weeks of real use, copy the numbers from `/stats` into the README.
