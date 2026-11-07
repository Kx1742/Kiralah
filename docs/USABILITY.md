# Usability test kit

Two things only real people on real phones can check: whether a stranger can use SplitLah without help, and whether it works inside WhatsApp. Run both after deploying, and before Phase 6. The README's "Usability testing findings" section is filled from this.

## 1. Three friends, no explanation

**Who:** 3 friends who have never seen SplitLah. At least one on an older or cheaper Android phone, and at least one on an iPhone. Mix of English, Malay and Chinese speakers if you can.

**Setup (you, beforehand):** make a real bill from a recent meal (receipt scan or typed), with each friend's name on it. Don't show them anything.

**Rules while watching:** don't explain, don't point, don't help unless they're completely stuck for 30 seconds. Note where they hesitate, what they say out loud, and what they tap that does nothing.

### Task A: friend (target: under 20 seconds)

Send them the link in WhatsApp with just: "Can you pay your share?" Start a stopwatch when they tap the link, and stop it when they tap "I've paid ✅".

|                                 | Friend 1 | Friend 2 | Friend 3 |
| ------------------------------- | -------- | -------- | -------- |
| Phone / browser                 |          |          |          |
| Language shown                  |          |          |          |
| Seconds to "I've paid"          |          |          |          |
| Found their name first time?    |          |          |          |
| Understood "Who shared?"        |          |          |          |
| Trusted the amount? (ask after) |          |          |          |
| Where they got stuck            |          |          |          |

### Task B: payer (target: under 60 seconds)

Give one friend a real receipt and say: "Split this with us on WhatsApp." Start the stopwatch when they open the site, and stop it when the WhatsApp message is sent.

|                               | Payer |
| ----------------------------- | ----- |
| Seconds from open to sent     |       |
| Used receipt scan or typed?   |       |
| Scan got the items right?     |       |
| Changed service charge / SST? |       |
| Where they got stuck          |       |

### Afterwards, ask each person

1. What was confusing, even for a second?
2. Was anything missing?
3. Would you use this instead of what you do now? Why or why not?

### Then

Fix the top 3 problems, note each finding and what changed in the README, and re-time the task that failed.

## 2. WhatsApp's in-app browser

The automated tests run Chromium at phone size, which is close to, but not the same as, WhatsApp's built-in browser. Check each row on a real Android phone and a real iPhone.

| Check                                                              | Android | iPhone |
| ------------------------------------------------------------------ | ------- | ------ |
| Link preview shows the kopitiam image, restaurant, total and payer |         |        |
| Tapping the link opens the bill inside WhatsApp                    |         |        |
| Language matches the phone                                         |         |        |
| "Who are you?" and tapping dishes work; amounts update             |         |        |
| "Copy" for the account number pastes correctly into a banking app  |         |        |
| DuitNow QR shows clearly; long-press to save works                 |         |        |
| "I've paid ✅" sticks after closing and reopening the link         |         |        |
| Payer: "Share to WhatsApp" opens WhatsApp with the message ready   |         |        |
| Payer: "Remind" opens WhatsApp with the right amount               |         |        |
| Receipt scan: camera opens; photo uploads on mobile data           |         |        |
| Dark mode and large text look right                                |         |        |
| Turn on airplane mode: the offline message shows                   |         |        |
| Add to home screen (Chrome / Safari): icon and name look right     |         |        |
