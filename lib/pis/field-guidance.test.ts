import assert from "node:assert/strict";
import test from "node:test";

import taxonomySeed from "@/lib/pis/taxonomy-seed.json";
import { FIELD_GUIDANCE } from "@/lib/pis/field-guidance";

test("every market field has a buyer sentence", () => {
  const fields = (taxonomySeed as { fields: { slug: string }[] }).fields;
  const missing = fields.map((field) => field.slug).filter((slug) => !FIELD_GUIDANCE[slug]);
  assert.deepEqual(missing, []);
  assert.equal(fields.length, 38);
});
