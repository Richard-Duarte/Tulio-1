// Gera public/og-tulio.jpg a partir da versão base64 versionada (thumbnail de link).
import { readFileSync, writeFileSync } from "node:fs";
const src = new URL("../public/og-tulio.jpg.b64", import.meta.url);
const out = new URL("../public/og-tulio.jpg", import.meta.url);
writeFileSync(out, Buffer.from(readFileSync(src, "utf8").trim(), "base64"));
