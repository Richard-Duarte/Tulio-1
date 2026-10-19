import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");

test("mobile menu wraps instead of scrolling sideways", () => {
  const header = read("components/jula/SiteHeader.tsx");
  const nav = header.match(/<nav[\s\S]*?className="([^"]+)"/);
  assert.ok(nav, "nav className missing");
  assert.match(nav[1]!, /(^|\s)flex-wrap(\s|$)/);
  assert.doesNotMatch(nav[1]!, /(^|\s)overflow-x-auto(\s|$)/, "only md: may scroll");
  assert.match(read("routes/__root.tsx"), /pt-\[var\(--site-header-h/);
});

test("bookings line shows on mobile too and never splits the address mid-word", () => {
  const bar = read("components/jula/SocialBar.tsx");
  const mail = bar.match(/href=\{`mailto:\$\{email\}`\}\s*className="([^"]+)"/);
  assert.ok(mail, "bookings link missing");
  assert.doesNotMatch(mail[1]!, /(^|\s)hidden(\s|$)/);
  assert.doesNotMatch(mail[1]!, /break-all/);
  assert.doesNotMatch(read("routes/index.tsx"), /Bookings ·/, "no second bookings block at the end");
});

test("marquee photos use a divider that stays vertical on phones", () => {
  const index = read("routes/index.tsx");
  assert.match(index, /nc-dither-img nc-line-r/);
  assert.doesNotMatch(index, /nc-dither-img nc-grid-border-r/);
  assert.match(read("styles.css"), /\.nc-line-r\s*\{/);
});

test("strip photos cannot be selected or dragged (repeated clicks washed them out)", () => {
  const index = read("routes/index.tsx");
  assert.match(index, /overflow-hidden select-none">\s*<div className="marquee-track/);
  assert.match(index, /draggable=\{false\}\s*className="nc-dither-img[^"]*\[-webkit-user-drag:none\]/);
});

test("stacked mobile cells do not double the section's closing line", () => {
  const css = read("styles.css");
  assert.match(css, /\.nc-grid-3 > :last-child > \.nc-grid-border-r/);
  assert.match(css, /\.nc-grid-hero > \.nc-hero-copy/);
  assert.doesNotMatch(read("components/nocturna/NocturnaHero.tsx"), /nc-hero nc-grid-border-b/);
});

test("mobile hero shows the photo before the bio, centered text and CTAs", () => {
  const hero = read("components/nocturna/NocturnaHero.tsx");
  assert.match(hero, /max-md:order-first/);
  assert.match(hero, /nc-hero-copy[^"]*max-md:text-center/);
  assert.match(read("routes/index.tsx"), /nc-cta-pair[^"]*max-md:justify-center/);
});
