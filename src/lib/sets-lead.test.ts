import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSetsLead } from "./sets-lead.ts";

test("formatSetsLead adds blank line after first sentence", () => {
  const in_ =
    "Uma seleção de sets que traduzem minha identidade musical, explorando diferentes sonoridades da house music. Feitos para a pista, do começo ao fim.";
  const out = formatSetsLead(in_);
  assert.match(out, /house music\.\n\nFeitos para a pista/);
});

test("formatSetsLead keeps explicit newlines", () => {
  const text = "Linha um.\n\nLinha dois.";
  assert.equal(formatSetsLead(text), text);
});