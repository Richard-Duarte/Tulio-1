import assert from "node:assert/strict";
import { test } from "node:test";
import { coercePresskitAdminSettings } from "./presskit-admin-settings.ts";

test("coercePresskitAdminSettings tolerates null and partial site_settings", () => {
  assert.deepEqual(coercePresskitAdminSettings(null), {
    release_title: "",
    release_body: "",
    logo_url: null,
    presskit_logo_urls: undefined,
    presskit_rider: undefined,
  });
  assert.deepEqual(
    coercePresskitAdminSettings({
      release_body: "texto",
      logo_url: "https://cdn/logo.png",
      presskit_rider: [["CDJ 3000"]],
    }),
    {
      release_title: "",
      release_body: "texto",
      logo_url: "https://cdn/logo.png",
      presskit_logo_urls: undefined,
      presskit_rider: [["CDJ 3000"]],
    },
  );
});