import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.join(__dirname, "../node_modules/@radix-ui/colors");
const OUTPUT_DIR = path.join(__dirname, "../app/components/_global_styles");

// Canonical Radix scale order (grays first, then hues) — matches the
// existing hand-authored colors.css so regenerating doesn't reorder it.
const SCALES = [
  "gray",
  "mauve",
  "slate",
  "sage",
  "olive",
  "sand",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
] as const;

const OVERLAY_FILES = ["black-alpha.css", "white-alpha.css"];

type VarEntry = [name: string, value: string];

interface ParsedFile {
  vars: VarEntry[];
  p3Vars: VarEntry[];
}

function parseCssFile(filePath: string): ParsedFile {
  const contents = fs.readFileSync(filePath, "utf8");
  const [base, p3 = ""] = contents.split("@supports");
  const varPattern = /--([\w-]+):\s*([^;]+);/g;

  const extract = (block: string): VarEntry[] =>
    [...block.matchAll(varPattern)].map(([, name, value]) => [
      name,
      value.trim(),
    ]);

  return { vars: extract(base), p3Vars: extract(p3) };
}

const EMPTY_PARSED_FILE: ParsedFile = { vars: [], p3Vars: [] };

interface ScaleGroup {
  base: ParsedFile;
  alpha: ParsedFile;
}

function collectGroups(mode: "light" | "dark"): ScaleGroup[] {
  const groups: ScaleGroup[] = [];

  for (const scale of SCALES) {
    const baseFile = mode === "light" ? `${scale}.css` : `${scale}-dark.css`;
    const alphaFile =
      mode === "light" ? `${scale}-alpha.css` : `${scale}-dark-alpha.css`;

    groups.push({
      base: parseCssFile(path.join(PACKAGE_DIR, baseFile)),
      alpha: parseCssFile(path.join(PACKAGE_DIR, alphaFile)),
    });
  }

  const overlayHex: VarEntry[] = [];
  const overlayP3: VarEntry[] = [];
  for (const file of OVERLAY_FILES) {
    const parsed = parseCssFile(path.join(PACKAGE_DIR, file));
    overlayHex.push(...parsed.vars);
    overlayP3.push(...parsed.p3Vars);
  }
  // black-alpha/white-alpha have no solid scale, so they're alpha-only.
  groups.push({
    base: EMPTY_PARSED_FILE,
    alpha: { vars: overlayHex, p3Vars: overlayP3 },
  });

  return groups;
}

function renderDeclarations(entries: VarEntry[]): string {
  return entries
    .map(([name, value]) => `  --color-${name}: ${value};`)
    .join("\n");
}

function renderSelectorBlock(selector: string, groups: ScaleGroup[]): string {
  const body = groups
    .map((group) =>
      renderDeclarations([...group.base.vars, ...group.alpha.vars]),
    )
    .filter((block) => block.length > 0)
    .join("\n\n");
  return `${selector} {\n${body}\n}`;
}

function renderP3Block(selector: string, groups: ScaleGroup[]): string {
  const body = groups
    .map((group) =>
      renderDeclarations([...group.base.p3Vars, ...group.alpha.p3Vars]),
    )
    .filter((block) => block.length > 0)
    .join("\n\n");
  return [
    "@supports (color: color(display-p3 1 1 1)) {",
    "  @media (color-gamut: p3) {",
    `    ${selector} {`,
    body
      .split("\n")
      .map((line) => (line ? `    ${line}` : line))
      .join("\n"),
    "    }",
    "  }",
    "}",
  ].join("\n");
}

function generateColorsCss(): string {
  const light = collectGroups("light");
  const dark = collectGroups("dark");

  return `${[
    renderSelectorBlock(":root,\n.light", light),
    renderP3Block(":root,\n.light", light),
    renderSelectorBlock(".dark,\nhtml.dark", dark),
    renderP3Block(".dark,\nhtml.dark", dark),
  ].join("\n\n")}\n`;
}

function renderObjectBody(groups: ScaleGroup[], pick: keyof ScaleGroup) {
  return groups
    .map((group) =>
      group[pick].vars
        .map(([name, value]) => `  "${name}": "${value}",`)
        .join("\n"),
    )
    .filter((block) => block.length > 0)
    .join("\n\n");
}

function generateColorsTs(): string {
  const light = collectGroups("light");
  const colorsBody = renderObjectBody(light, "base");
  const alphaColorsBody = renderObjectBody(light, "alpha");

  return (
    `export const colors = {\n${colorsBody}\n} as const;\n\n` +
    `export const alphaColors = {\n${alphaColorsBody}\n} as const;\n`
  );
}

fs.writeFileSync(path.join(OUTPUT_DIR, "colors.css"), generateColorsCss());
fs.writeFileSync(path.join(OUTPUT_DIR, "colors.ts"), generateColorsTs());

// eslint-disable-next-line no-console
console.log("Generated colors.css and colors.ts from @radix-ui/colors");
