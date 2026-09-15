import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("production uses only the approved custom domain and live origins", () => {
  const config = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(config, /^name = "rna-forge-contact"$/m);
  assert.match(config, /^workers_dev = false$/m);
  assert.match(config, /^preview_urls = false$/m);
  assert.match(config, /^routes = \[\{ pattern = "contact\.rnaforge\.com", custom_domain = true, zone_id = "aaec8cdb32202c0028dc008713617a59" \}\]$/m);
  assert.match(config, /^ALLOWED_ORIGINS = "https:\/\/rnaforge\.com,https:\/\/www\.rnaforge\.com"$/m);
  assert.match(config, /^ALLOWED_HOSTNAMES = "rnaforge\.com,www\.rnaforge\.com"$/m);
  assert.match(config, /^SITE_ORIGIN = "https:\/\/rnaforge\.com"$/m);
  assert.match(config, /^CONTACT_DELIVERY_ENABLED = "true"$/m);
  assert.match(config, /^CONTACT_TEST_MODE = "false"$/m);
  assert.ok(!config.includes("github.io"));
  assert.ok(!config.includes("CONTACT_TEST_EXPIRES_AT"));
});
