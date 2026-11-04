// The Markdown content format, shared by the compiler and the one-time
// migration. See CONTRIBUTING.md for the human-readable version.
//
//   content/<section>/[<sub>/]<id>.md
//
//   ---
//   name: Flob
//   level: 1
//   ...structured fields (YAML)...
//   ---
//
//   ## Notes
//   Free text.
//
// The file name is the entry's id; the folders are its section and sub-list.

export const SECTIONS = [
  { section: "mobs", title: "Mobs" },
  { section: "weapons", title: "Weapons" },
  { section: "armor", title: "Armor" },
  { section: "magic", title: "Magic" },
  { section: "craft", title: "Craft" },
  { section: "quests", title: "Quests" },
  { section: "maps", title: "Maps" },
  { section: "misc", title: "Misc" },
  { section: "notes", title: "Notes" },
];

/** Sections whose entries live in sub-folders, and the sub-folders allowed. */
export const SUBS = {
  weapons: ["guns", "swords"],
  craft: ["alchemy", "engineering", "smithy"],
  misc: ["baseitems", "heals", "plantsminerals", "ssorbs", "vehicles"],
};

export const ELEMENTS = ["normal", "fire", "water", "rune", "relic", "earth", "air", "death", "flare", "heal", "cold"];
export const RESIST_ELEMENTS = ["normal", "fire", "water", "rune", "relic", "earth", "air", "death"];
export const PLAYER_RACES = ["AP", "BL", "HF", "HM"];

// Field types, used to validate contributions.
const num = { type: "number" };
const nums = { type: "number-or-numbers" };
const str = { type: "string" };
const bool = { type: "boolean" };
const strs = { type: "strings" };
const itemQty = { type: "list", of: { item: str, qty: num }, required: ["item"] };

/** Front-matter fields, in the order they are written. */
export const FIELDS = {
  name: str,
  level: num,
  race: str,
  aggressive: bool,
  hp: num,
  element: { type: "enum", values: ELEMENTS },
  attack: {
    type: "object",
    of: {
      element: { type: "enum", values: ELEMENTS },
      damage: { type: "number-or-numbers-or-unknown" },
      splash: { type: "number-or-numbers-or-boolean" },
      rate: nums,
      directDamage: nums,
      splashDamage: { type: "number-or-numbers-or-boolean" },
    },
  },
  credits: { type: "object", of: { min: num, max: num } },
  requires: { type: "object", of: { str: num, dex: num, wis: num } },
  resist: { type: "object", of: Object.fromEntries(RESIST_ELEMENTS.map((e) => [e, num])) },
  store: { type: "number-or-false" },
  dropsFromMobs: bool,
  smithed: bool,
  engineered: bool,
  quested: bool,
  buy: { type: "number-or-string" },
  sell: { type: "number-or-string" },
  hpBonus: { type: "number-or-string" },
  flies: bool,
  flightTime: { type: "number-or-string" },
  superSpeedDuration: num,
  rank: str,
  circle: str,
  product: str,
  category: str,
  vehicleType: str,
  result: str,
  ingredients: itemQty,
  parts: itemQty,
  drops: { type: "list", of: { item: str, chance: str }, required: ["item"] },
  locations: strs,
  /** Player races the entry is listed for, when that differs from its `race`. */
  races: { type: "races" },
  iconId: num,
  pic: str,
  picNote: str,
  source: { type: "enum", values: ["monsterbytes"] },
};

/** Body headings and the fields they hold. Notes entries use the whole body as `text`. */
export const BODY = [
  { heading: "Effects", field: "effects" },
  { heading: "Steps", field: "steps", list: true },
  { heading: "Notes", field: "notes" },
  { heading: "Uses", field: "usesNotes" },
];

/** Browse-window filters, rebuilt from the fields (they were stored separately in the program). */
export function filtersFor(section, sub, e) {
  const f = {};
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (section === "mobs") {
    if (e.race) f.race = e.race;
    if (e.attack?.element) f.channel = cap(e.attack.element);
  } else if (section === "weapons") {
    if (e.race) f.race = e.race;
    f.sub = sub === "swords" ? "Melee" : "Guns";
  } else if (section === "armor") {
    if (e.race) f.race = e.race;
  } else if (section === "magic") {
    if (e.circle) f.circle = e.circle;
  } else if (section === "craft") {
    if (e.product) f.product = e.product;
  } else if (section === "quests") {
    if (e.race) f.race = e.race;
    if (e.category) f.category = e.category;
  } else if (section === "misc") {
    if (e.vehicleType) f.vtype = e.vehicleType;
  } else if (section === "notes") {
    if (e.category) f.category = e.category;
  }
  return f;
}

/** Player races an entry is listed for: as written, or its own player race. */
export function racesFor(e) {
  if (Array.isArray(e.races)) return e.races;
  return PLAYER_RACES.includes(e.race) ? [e.race] : [];
}

export const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const ORIGINAL_SITE = "https://ea.cataclaw.net/monsterbytes";
