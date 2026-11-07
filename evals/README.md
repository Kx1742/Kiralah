# Receipt-reading eval

Measures how well Claude reads Malaysian receipts, by comparing what it returns with answers checked by hand.

```bash
ANTHROPIC_API_KEY=... pnpm eval
```

Each run sends every receipt in `receipts/` to the API: a few cents in total at Claude Haiku 5.5's prices. Results are printed and written to `results/latest.json`, which is not committed.

## Scores

| Score           | Meaning                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| Items found     | Expected dishes that were read, matched by name in any language         |
| Prices correct  | Found dishes whose amount and quantity are both exactly right           |
| Extra items     | Lines that were read but aren't dishes, such as a total read as an item |
| Charges correct | Service charge and SST amounts both exactly right                       |
| Total correct   | The amount payable is exactly right                                     |

## Adding a receipt

Put the photo in `receipts/` (`.jpg`, `.png` or `.webp`), and next to it a `<same name>.expected.json` with what is printed:

```json
{
  "source": "real",
  "language": "ms",
  "restaurantName": "Restoran ABC",
  "items": [{ "name": "Nasi lemak", "quantity": 1, "lineTotal": "12.40" }],
  "serviceCharge": "1.24",
  "serviceTax": "0.82",
  "total": "14.45"
}
```

Remove names, card numbers and anything else personal from a photo before adding it.

## What's here now

Only **synthetic** receipts so far (`synthetic-*`): rendered from data, so they are sharper and tidier than real photos, and scores on them will be optimistic. The plan calls for 20 to 30 **real** receipt photos in English, Malay and Chinese, crumpled and badly lit ones included. The summary reports how many real receipts were scored.
