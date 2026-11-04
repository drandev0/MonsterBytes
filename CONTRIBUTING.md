# Adding to Monster Bytes

Everything in the guide is a Markdown file in [`content/`](content/). Fix a
number, add a drop or write up a quest, and once your change is merged the site
updates itself within a minute.

You don't need to install anything. Everything below works on github.com.

## Fix or add to an entry

1. Open the entry on the site and click **Edit this page on GitHub** at the bottom.
2. GitHub opens the file. Click the pencil to edit it (it will offer to make a
   copy of the project for you; say yes).
3. Make your change, then click **Commit changes…** and **Propose changes**.
4. Open the pull request. The checks run automatically. If something in the file
   is wrong, the check fails and GitHub marks the line with what to fix.

## Add a new entry

On any list page, click **Add a missing … entry on GitHub**. GitHub opens a new
file in the right folder with a starter entry filled in. Rename `new-entry.md`
to the entry's name (see [File names](#file-names)), fill in the fields, and
propose the change as above.

## What a file looks like

```markdown
---
name: Flob
level: 1
race: Kzon
aggressive: false
hp: 20
element: normal
attack: { element: normal }
credits: { min: 1, max: 5 }
drops:
  - { item: Flob Shell, chance: 100% }
  - { item: Agate, chance: rare }
locations:
  - Boomtown
  - Newbie Zone
pic: pix/flob.jpg
---

## Notes

Anything worth knowing that doesn't fit a field.
```

The part between the two `---` lines holds the fields. Below it, free text goes
under these headings, each optional:

| Heading | For |
|---|---|
| `## Effects` | What a spell or item does |
| `## Steps` | Quest steps, one per line, numbered `1.`, `2.`, … |
| `## Notes` | Anything else |
| `## Uses` | What a plant or mineral is used for |

Notes entries (in `content/notes/`) have no headings: the whole text is the note.

## Where files go

| Folder | Holds |
|---|---|
| `content/mobs/` | Monsters |
| `content/weapons/guns/`, `content/weapons/swords/` | Weapons |
| `content/armor/` | Armor |
| `content/magic/` | Spells |
| `content/craft/alchemy/`, `…/engineering/`, `…/smithy/` | Recipes |
| `content/quests/` | Quests |
| `content/maps/` | Maps |
| `content/misc/baseitems/`, `…/heals/`, `…/plantsminerals/`, `…/ssorbs/`, `…/vehicles/` | Other items |
| `content/notes/` | Notes (commands, abbreviations, …) |

### File names

The file name is the entry's address on the site: `content/mobs/infant-stount.md`
is at `/mobs/infant-stount`. Use lower-case letters, digits and dashes. Gear for
one race starts with the race: `ap-amberlaz.md`, `bl-pulse-mortar.md`.

Renaming a file changes the entry's address, so only rename to fix a mistake.

## Fields

Use only the fields an entry has. Spelling matters: an unknown field fails the check.

| Field | Example | Meaning |
|---|---|---|
| `name` | `Flob` | **Required.** The name as shown in game |
| `level` | `6` | Level |
| `race` | `Kzon`, `AP` | Monster race, or player race: `AP` amphibian, `BL` blob, `HF` human female, `HM` human male. Quests may use `ALL` |
| `aggressive` | `true` | The monster attacks on sight |
| `hp` | `1500` | Hit points |
| `element` | `fire` | One of `normal`, `fire`, `water`, `rune`, `relic`, `earth`, `air`, `death`, `flare`, `heal`, `cold` |
| `attack` | `{ element: fire, damage: 40, rate: 1.16 }` | Any of `element`, `damage`, `splash`, `rate`, `directDamage`, `splashDamage`. A value that changes by mode is a list: `damage: [ 30, 0 ]`. Unknown damage is `"???"` |
| `credits` | `{ min: 2, max: 10 }` | Credits a monster drops |
| `drops` | `- { item: Agate, chance: rare }` | What a monster drops. `item` should match the item's `name` so it links |
| `locations` | `- Boomtown` | Where it's found. Use an existing place name so it joins that place's page |
| `requires` | `{ str: 20, dex: 40, wis: 20 }` | Stats needed to use it |
| `resist` | `normal: 2` (one per line) | Resistance per element: `normal`, `fire`, `water`, `rune`, `relic`, `earth`, `air`, `death` |
| `store` | `85` or `false` | Store price in credits, or `false` if it isn't sold |
| `dropsFromMobs`, `smithed`, `engineered`, `quested` | `true` | Ways to get it |
| `buy`, `sell` | `491` or `N/A` | Prices |
| `hpBonus` | `195` | HP an item heals or adds |
| `flies`, `flightTime`, `superSpeedDuration` | `true`, `17` | Vehicles |
| `rank` | `Novice` | Crafting rank a recipe needs |
| `ingredients`, `parts` | `- { item: Ash, qty: 1 }` | What a recipe or spell uses |
| `circle` | `"2"` | Spell circle |
| `product` | `Ammo` | What kind of thing a recipe makes |
| `category` | `ARMOR` | Quest or note category |
| `vehicleType` | `JetPacks and Wings` | Vehicle type |
| `result` | `"[AP] Single Horn"` | What a quest rewards |
| `races` | `[ AP, BL, HF, HM ]` | Player races a quest is listed for, if not just its `race` |
| `iconId` | `146` | Inventory icon: its number on `public/mb/chrome/icons.png`, 16 per row, counting from 1 |
| `pic` | `pix/flob.jpg` | Picture, in `public/mb/` |
| `picNote` | | Note about the picture |
| `source` | `monsterbytes` | Leave as is: marks entries from the original program, which link to its preserved page |

Names starting with `[`, like `[AP] Amberlaz`, need quotes: `name: "[AP] Amberlaz"`.

## Pictures

Add the image to `public/mb/pix/` in the same pull request (on GitHub: **Add
file → Upload files** in that folder), then set `pic: pix/your-file.jpg`.
Please only upload screenshots you took yourself.

## Checking on your own computer

With [Node.js](https://nodejs.org) 22 or newer:

```
npm install
npm run check   # checks every file and lists any problems
```

The same check runs on every pull request.
