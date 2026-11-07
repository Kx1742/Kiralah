# Decisions

Why SplitLah is built the way it is. Newest thinking wins; update this file when a decision changes.

## Node 24 LTS

The project pins Node 24 (`.nvmrc`, `engines`). Current ESLint, Vitest and lint-staged no longer run on older odd-numbered releases, and Vercel and CI both offer 24.

## Language in a cookie, not in the URL

`localePrefix: "never"`. A bill link is the same for everyone (`/b/x7Kp2`), stays short in WhatsApp, and opens in each friend's own language. Order: saved cookie, then the phone's `Accept-Language`, then English. The cost is no per-language URLs for search engines, which does not matter: bills are private and the home page is the only page worth indexing.

## Prisma 7 with the `pg` driver adapter

The connection is made lazily on first query, so `next build` never needs a database. At runtime `DATABASE_URL` is Neon's pooled string; migrations use `DIRECT_URL`, because migrations must not go through a transaction pooler.

## No login: random links and edit tokens

Nobody signs up. A bill is identified by a 16-character random ID (about 95 bits), which cannot be guessed, so the link is the permission to view it.

When a bill is created, the server makes a secret **edit token** and returns it once. It stays in the payer's browser, and the database holds only its SHA-256 hash, so a leaked database cannot be used to edit bills. The cost: clearing browser data, or switching phones, loses edit access to that bill. For a bill that lives 30 days and is shared once, that is the right trade for having no accounts.

## Dishes and people are tables; charges and vouchers are JSON

Friends will tap dishes at the same moment. Separate rows let those writes not collide, which one JSON blob for the whole bill could not. Charges, vouchers and adjustments only change with the payer, so they stay as JSON and are validated with Zod every time they are read.

## Payment QR stored in Postgres, not R2

The phone shrinks the image first (to 700px), and the server refuses anything over 300 KB. At that size `bytea` is simple, needs no second service or keys, and is deleted with the bill. If usage ever outgrew Neon's free storage, moving to R2 would be a small change to one module. The server checks the file's actual bytes, never the type it claims, and serves it with `nosniff`.

## Payer flow order

Items, charges, names, vouchers, payment. Vouchers come after names because "who keeps the savings?" needs the names. This differs slightly from the plan, which lists charges and vouchers before names.

Anything typed but not added is kept, and added on Next. "Split a bill" reopens an unfinished draft, and Start over needs a second tap.

## Share button

On phones with the Web Share API, the button opens the phone's share sheet, so WhatsApp is one more tap away. Elsewhere it opens `wa.me` directly. The plan asked for this order, and the sheet lets the payer choose WhatsApp Business or another app. Going straight to `wa.me` would be one tap fewer, so this is worth checking in the usability test.

## Rate limiting without storing IPs

Bill creation is limited per hour, counted in Postgres so it works across serverless instances. The key is a salted hash of IP, action and hour, so no IP address is ever stored.

## Link preview

The preview text and image use the payer's language, saved on the bill, because WhatsApp's preview bot has no language of its own. The image draws Chinese names by fetching just those letters from Google Fonts at render time. If that fails it falls back to the built-in font, and such a name may not display.

## Money rules

All money logic lives in `packages/core`, in integer sen. Rates are basis points (1000 = 10%). Inside the engine, shares of shares are kept as exact fractions (BigInt), never floats, and rounded once at the end.

### Calculation order

1. **Items.** Quantity × price. Own items go to that person. Shared items split by portions: equal by default, or custom such as 2:1.
2. **Item promos** (1-for-1, free units, % or RM off an item) reduce that item's price, so only the people who had it benefit.
3. **Bill-wide vouchers, then charges,** or the reverse: `discountTiming` is a bill setting, because some restaurants take a voucher off the final amount.
4. **Service charge** on the running amount. **Service tax** on that amount plus the service charge. `taxOnServiceCharge` can turn the second part off. Each is rounded half up to whole sen, as receipts print them. `pricesIncludeCharges` ("nett") skips both. SST with no service charge is a 0% service charge.
5. **Service charge and tax are split** in proportion to what each person owes at that point.
6. **Adjustment lines** make the bill match a receipt. An extra charge follows what people ordered. A reduction follows what people owe, so it can never push anyone below zero.
7. **Rounding,** described below.

### Vouchers

- **Minimum spend** is checked against the items' full price, before any discount. Otherwise removing one discount could switch another on.
- **"Whose voucher?"** Savings are shared in proportion by default. If the owner keeps them, they get the saving up to what they owe and never go below zero. Any excess goes to everyone else, so the voucher's full value still comes off the bill.
- **Limit:** 1-for-1 is per item line. Two different dishes on one promo need a RM-off promo on the free one.

### Rounding

Shares add up to exactly the total, using the **largest-remainder method:** everyone is rounded down to a whole sen, then the leftover sen go to the biggest fractions. `extraSen` records who absorbed one, so the app can show it. **The payer takes the extra sen in a tie,** because nobody should chase a friend for 1 sen.

Someone who owes a whole amount never gets a leftover, and neither does someone who had nothing.

**Cash rounding** (optional) rounds the total to the nearest 5 sen, then runs the same method in units of 5 sen, so every share is payable in real coins and they still add up.

**Each person's breakdown adds up to exactly their share,** using the same method across their lines. Summed across people, a line such as service charge can differ from the receipt's line by a sen or two. Shares and the total are always exact.

### Unclaimed items

Until someone picks a dish, its cost sits in `unclaimedSen`, including its share of service charge and tax. Your amount does not jump as friends pick, and shares plus unclaimed always add up to the total.

### Receipt check

The payer can enter the receipt total. The engine reports the difference, which is also the adjustment line that would fix it, and flags when turning on cash rounding would fix it instead.

### Worked example: member 20% off, savings shared

Ali had Set A (RM35.90), Bee had Set B (RM29.90), and they shared fries (RM13.20). Defaults: 10% service, 6% SST.

| Step           | Sum                   | Amount      |
| -------------- | --------------------- | ----------- |
| Subtotal       | 35.90 + 29.90 + 13.20 | RM79.00     |
| Member 20% off | 20% of 79.00          | −RM15.80    |
| After discount |                       | RM63.20     |
| Service charge | 10% of 63.20          | RM6.32      |
| SST            | 6% of 69.52 = 4.1712  | RM4.17      |
| **Total**      | 63.20 + 6.32 + 4.17   | **RM73.69** |

Ali ordered RM42.50 of the RM79.00 and Bee RM36.50, so:

|     | Exact                              | Rounded down | Leftover 1 sen | Pays        |
| --- | ---------------------------------- | ------------ | -------------- | ----------- |
| Ali | 42.50 ÷ 79 × 73.69 = RM39.64**33** | RM39.64      |                | **RM39.64** |
| Bee | 36.50 ÷ 79 × 73.69 = RM34.04**67** | RM34.04      | +1 sen         | **RM34.05** |

RM39.64 + RM34.05 = RM73.69, exactly the receipt. Bee's fraction is bigger, so Bee absorbs the extra sen.

### Two honest exceptions to "removing a discount never lowers anyone's share"

The plan asked for this rule without exceptions. It holds in practice, with two exceptions, and both are pinned by tests in `properties.test.ts`.

1. **Rounding, up to a few sen.** Largest-remainder cannot guarantee it: Balinski and Young proved no method can both stay within rounding of the exact share and never move a share the wrong way. Service charge and tax are also rounded on the bill before they are split. Example with default charges: RM12.50, RM17.50 and RM34.50, plus a 1-sen voucher. Without the voucher the first person pays RM14.57; with it, RM14.58. The property test allows only this rounding tolerance.
2. **A percentage voucher someone keeps for themselves.** It is a percentage of the bill, so a bigger bill saves its owner more. Remove another diner's promo and the owner's share really does fall. This is correct: the restaurant really does take more off, and the owner keeps it, as chosen.

### Test fixtures are not real receipts yet

`packages/core/fixtures/` has hand-calculated examples modelled on common Malaysian receipt formats. The plan asks for real receipts, which still need collecting. They use the same format and can be added as they come in.

## Design system

A Malaysian kopitiam: the feeling of sitting down at a marble table in a restored Peranakan shophouse. It says "makan" at first glance, and it feels local.

- **Home is the shopfront:** jade wall, mint louvred shutters, red-striped awning, rattan lamp, encaustic floor, and a marble table with kopi, teh tarik, kaya toast and the bill. **Inner screens are the cream wall** with marble-white cards, because forms need quiet.
- **Chilli red means the one main action** on a screen. The awning is the only other red, and it is decoration at the screen edge.
- **Brush font only for the brand and big numbers,** like a hand-painted signboard. Everything else is Nunito, which stays readable on small screens. Chinese uses the phone's system font: a CJK web font would be several megabytes on slow data.
- **The home table is a real tap demo:** tap the kopi, teh tarik or toast and it shows "You pay Ali RM5.50". People learn the friend flow by trying it, before anyone makes a bill.
- **The lamp, shutters and cat are toys.** Nothing depends on them, so they are out of the keyboard order and hidden from screen readers, and they never compete with the main action.
- **Illustrations are inline SVG; the wall and floor are CSS:** no image downloads. Motion stops under `prefers-reduced-motion`.
