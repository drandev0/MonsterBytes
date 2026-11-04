// Compiles content/**/*.md into the data the app shows. The server runs this
// on every update from GitHub; on the command line it checks the content.
// Every file is validated, and each problem names the file, the line and what
// to fix (shown inline on pull requests when run in GitHub Actions).
//
//   node scripts/compile-content.mjs [folder]   check <folder>/content (default: this repo) and list any problems
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  BODY, FIELDS, ID_PATTERN, ORIGINAL_SITE, PLAYER_RACES, SECTIONS, SUBS, filtersFor, racesFor,
} from "./content-format.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(root, "content");
const PICTURES = join(root, "public", "mb");

/** Fields that only feed the Browse filters or the source link, not the entry itself. */
const NOT_COPIED = new Set(["circle", "product", "category", "vehicleType", "source", "races"]);

/**
 * @param contentDir  folder holding the section folders (mobs/, weapons/, …)
 * @param picturesDir folder `pic:` paths are relative to, used to check they exist
 */
export async function compileContent(contentDir = CONTENT, picturesDir = PICTURES) {
  const problems = [];
  const files = [];
  for (const { section } of SECTIONS) {
    const dir = join(contentDir, section);
    if (!existsSync(dir)) continue;
    for (const path of await walk(dir)) if (path.endsWith(".md")) files.push(path);
  }

  const bySection = new Map(SECTIONS.map((s) => [s.section, []]));
  for (const path of files) {
    const rel = relative(contentDir, path).split(sep);
    const report = (message, line = 1) =>
      problems.push({ file: ["content", ...rel].join("/"), line, message });
    const entry = await compileFile(path, rel, report, picturesDir);
    if (entry) bySection.get(entry.section).push(entry);
  }

  // Stray files outside the known sections.
  for (const name of existsSync(contentDir) ? await readdir(contentDir) : []) {
    if (name.endsWith(".md") || name.startsWith(".")) continue;
    if (!SECTIONS.some((s) => s.section === name))
      problems.push({ file: `content/${name}`, line: 1, message: `"${name}" is not a section. Use one of: ${SECTIONS.map((s) => s.section).join(", ")}.` });
  }

  const sections = [];
  const out = {};
  for (const { section, title } of SECTIONS) {
    const entries = bySection.get(section).sort(order(section));
    const subs = SUBS[section] ? SUBS[section].filter((s) => entries.some((e) => e.sub === s)) : [];
    out[section] = { section, title, subs, count: entries.length, entries };
    sections.push({ section, title, subs, count: entries.length, file: `${section}.json` });
  }
  const index = { source: "content/", builtAt: new Date().toISOString(), sections };
  return { index, out, problems, fileCount: files.length };
}

async function compileFile(path, rel, report, picturesDir) {
  const raw = (await readFile(path, "utf8")).replace(/\r\n/g, "\n").replace(/^﻿/, "");
  const section = rel[0];
  const sub = rel.length === 3 ? rel[1] : null;
  const id = rel[rel.length - 1].replace(/\.md$/, "");

  if (SUBS[section]) {
    if (rel.length !== 3 || !SUBS[section].includes(sub)) {
      report(`${section} entries go in a sub-folder: ${SUBS[section].map((s) => `content/${section}/${s}/`).join(", ")}.`);
      return null;
    }
  } else if (rel.length !== 2) {
    report(`${section} entries go directly in content/${section}/, not in a sub-folder.`);
    return null;
  }
  if (!ID_PATTERN.test(id)) {
    report(`The file name "${id}.md" must be lower-case letters, digits and dashes, like "infant-stount.md".`);
    return null;
  }

  const m = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!m) {
    report("The file must start with a front-matter block: a line with ---, the fields, then another line with ---.");
    return null;
  }
  const [, yamlText, body] = m;
  const lineOf = (key) => {
    const i = yamlText.split("\n").findIndex((l) => l.startsWith(`${key}:`));
    return i < 0 ? 1 : i + 2;
  };

  let fm;
  try {
    fm = parseYaml(yamlText) ?? {};
  } catch (err) {
    const why = err.message.split("\n")[0].replace(/:\s*$/, "");
    const hint = /\[|\{|flow/i.test(why) ? ' Text starting with [ or { needs quotes, like name: "[AP] Amberlaz".' : "";
    report(`The fields aren't valid YAML: ${why}.${hint}`, (err.linePos?.[0]?.line ?? 0) + 1);
    return null;
  }
  if (typeof fm !== "object" || Array.isArray(fm)) {
    report("The front matter must be a list of fields like `name: Flob`.");
    return null;
  }

  let ok = true;
  const fail = (msg, key) => { ok = false; report(msg, key ? lineOf(key) : 1); };

  if (typeof fm.name !== "string" || !fm.name.trim()) fail("Every entry needs a `name:`.");
  for (const [key, value] of Object.entries(fm)) {
    const spec = FIELDS[key];
    if (!spec) { fail(`Unknown field \`${key}\`. Known fields are listed in CONTRIBUTING.md.`, key); continue; }
    for (const msg of check(value, spec, key)) fail(msg, key);
  }
  if (fm.iconId !== undefined && (fm.iconId < 0 || fm.iconId > 256 || !Number.isInteger(fm.iconId)))
    fail("`iconId` must be a whole number from 1 to 256 (its place on chrome/icons.png), or 0 for none.", "iconId");
  if (typeof fm.pic === "string" && !existsSync(join(picturesDir, fm.pic)))
    fail(`Picture \`${fm.pic}\` not found. Pictures go in public/mb/, e.g. \`pic: pix/flob.jpg\`.`, "pic");

  const bodyStart = yamlText.split("\n").length + 2; // the two --- lines
  const fields = parseBody(section, body, (msg, line) => { ok = false; report(msg, line + bodyStart); });
  if (!ok || !fields) return null;

  const entry = {
    id,
    name: fm.name,
    section,
    sub,
    url: fm.source === "monsterbytes" ? `${ORIGINAL_SITE}/${section}/${sub ? sub + "/" : ""}${id}` : null,
    pic: fm.pic ?? null,
    picNote: fm.picNote ?? null,
    element: fm.element ?? null,
    iconId: fm.iconId ?? null,
    filters: filtersFor(section, sub, fm),
    races: racesFor(fm),
  };
  for (const [key, value] of Object.entries(fm))
    if (!(key in entry) && !NOT_COPIED.has(key)) entry[key] = value;
  Object.assign(entry, fields);
  return entry;
}

/** Splits the body into its `## Heading` sections. */
function parseBody(section, body, report) {
  const fields = {};
  if (section === "notes") {
    const text = body.replace(/^\n+/, "").replace(/\n+$/, "");
    if (text) fields.text = text;
    return fields;
  }
  const lines = body.split("\n");
  let current = null;
  const chunks = [];
  lines.forEach((line, i) => {
    const h = line.match(/^## (.+?)\s*$/);
    if (h) {
      current = { heading: h[1], line: i, lines: [] };
      chunks.push(current);
    } else if (current) current.lines.push(line);
    else if (line.trim()) {
      report(`Text before the first heading is not shown. Put it under a heading: ${BODY.map((b) => "## " + b.heading).join(", ")}.`, i + 1);
    }
  });
  for (const c of chunks) {
    const spec = BODY.find((b) => b.heading.toLowerCase() === c.heading.toLowerCase());
    if (!spec) {
      report(`Unknown heading "## ${c.heading}". Use one of: ${BODY.map((b) => "## " + b.heading).join(", ")}.`, c.line + 1);
      return null;
    }
    const text = c.lines.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
    if (!text) continue;
    if (spec.list) {
      const items = text.split("\n").filter((l) => l.trim());
      const bad = items.find((l) => !/^\d+\.\s/.test(l));
      if (bad) {
        report(`Each step goes on its own line, numbered: "1. Talk to …". This line isn't: "${bad.slice(0, 60)}"`, c.line + 1);
        return null;
      }
      fields[spec.field] = items.map((l) => l.replace(/^\d+\.\s/, ""));
    } else fields[spec.field] = text;
  }
  return fields;
}

function check(value, spec, path) {
  const errs = [];
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const isNums = (v) => isNum(v) || (Array.isArray(v) && v.length > 0 && v.every(isNum));
  const want = (ok, what) => { if (!ok) errs.push(`\`${path}\` must be ${what}.`); };
  switch (spec.type) {
    case "number": want(isNum(value), "a number"); break;
    case "string":
      want(typeof value === "string", typeof value === "number" ? `text: put it in quotes, like "${value}"` : "text");
      break;
    case "boolean": want(typeof value === "boolean", "true or false"); break;
    case "strings": want(Array.isArray(value) && value.every((v) => typeof v === "string"), "a list of names"); break;
    case "number-or-numbers": want(isNums(value), "a number, or a list like [30, 0] for several levels"); break;
    case "number-or-numbers-or-unknown": want(isNums(value) || value === "???", 'a number, a list of numbers, or "???" if nobody knows yet'); break;
    case "number-or-numbers-or-boolean": want(isNums(value) || typeof value === "boolean", "a number, a list of numbers, or false"); break;
    case "number-or-false": want(isNum(value) || value === false, "a price in credits, or false if it isn't sold"); break;
    case "number-or-string": want(isNum(value) || typeof value === "string", "a number or text such as N/A"); break;
    case "races": want(Array.isArray(value) && value.every((v) => PLAYER_RACES.includes(v)), `a list of player races from: ${PLAYER_RACES.join(", ")}`); break;
    case "enum": want(spec.values.includes(value), `one of: ${spec.values.join(", ")}`); break;
    case "object":
      if (!value || typeof value !== "object" || Array.isArray(value)) { errs.push(`\`${path}\` must be a group of fields.`); break; }
      for (const [k, v] of Object.entries(value)) {
        if (!spec.of[k]) errs.push(`\`${path}.${k}\` is not a known field. Use: ${Object.keys(spec.of).join(", ")}.`);
        else errs.push(...check(v, spec.of[k], `${path}.${k}`));
      }
      break;
    case "list":
      if (!Array.isArray(value)) { errs.push(`\`${path}\` must be a list.`); break; }
      value.forEach((item, i) => {
        if (!item || typeof item !== "object") { errs.push(`\`${path}\` item ${i + 1} must look like { item: Agate, … }.`); return; }
        for (const r of spec.required) if (item[r] === undefined) errs.push(`\`${path}\` item ${i + 1} needs \`${r}:\`.`);
        for (const [k, v] of Object.entries(item)) {
          if (!spec.of[k]) errs.push(`\`${path}\` item ${i + 1}: \`${k}\` is not a known field. Use: ${Object.keys(spec.of).join(", ")}.`);
          else errs.push(...check(v, spec.of[k], `${path}[${i + 1}].${k}`));
        }
      });
      break;
  }
  return errs;
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const BY_LEVEL = new Set(["mobs", "weapons", "armor", "craft"]);

/** Default list order: by sub-list, then level (where it matters), then name. */
function order(section) {
  const subs = SUBS[section] ?? [];
  return (a, b) =>
    subs.indexOf(a.sub) - subs.indexOf(b.sub) ||
    (BY_LEVEL.has(section) ? (a.level ?? 999) - (b.level ?? 999) : 0) ||
    collator.compare(a.name, b.name) ||
    collator.compare(a.id, b.id);
}

async function walk(dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

// ---------- command line ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2] ? join(process.cwd(), process.argv[2]) : root;
  const { index, problems, fileCount } = await compileContent(join(dir, "content"), join(dir, "public", "mb"));
  if (problems.length) {
    const inCi = !!process.env.GITHUB_ACTIONS;
    for (const p of problems) {
      if (inCi) console.log(`::error file=${p.file},line=${p.line}::${p.message}`);
      console.error(`${p.file}:${p.line}  ${p.message}`);
    }
    console.error(`
${problems.length} problem${problems.length === 1 ? "" : "s"} in the content.`);
    process.exit(1);
  }
  const total = index.sections.reduce((n, s) => n + s.count, 0);
  console.log(`content: ${fileCount} files, ${total} entries, all valid`);
}
