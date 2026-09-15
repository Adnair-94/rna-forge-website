import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const manifest = JSON.parse(read("../package.json"));
const lock = JSON.parse(read("../package-lock.json"));

test("deployment tooling is pinned and locked without runtime dependencies", () => {
  const version = manifest.devDependencies.wrangler;
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(lock.packages[""].devDependencies.wrangler, version);
  assert.equal(lock.packages["node_modules/wrangler"].version, version);
  assert.deepEqual(manifest.dependencies || {}, {});
});

for (const name of ["deploy-contact-worker", "deploy-contact-staging", "test-contact-delivery"]) {
  test(`${name} installs the audited lockfile and preserves approval`, () => {
    const workflow = read(`../../.github/workflows/${name}.yml`);
    assert.ok(workflow.includes(`wranglerVersion: "${manifest.devDependencies.wrangler}"`));
    assert.ok(workflow.includes("npm ci --ignore-scripts"));
    assert.ok(workflow.includes("npm audit --audit-level=low"));
    assert.ok(workflow.indexOf("npm audit") < workflow.indexOf("uses: cloudflare/wrangler-action@"));
    assert.ok(workflow.includes("environment: contact-production"));
    assert.ok(workflow.includes("if: github.ref == 'refs/heads/main'"));
    if (name !== "deploy-contact-worker") {
      assert.ok(workflow.includes("cp contact-worker/package-lock.json"));
    }
  });
}

test("required validation depends on backend tests, dependency audit and dry runs", () => {
  const workflow = read("../../.github/workflows/contact-backend-check.yml");
  assert.match(workflow, /name: Validate site\s+needs: test/);
  assert.ok(workflow.includes("npm test --prefix contact-worker"));
  assert.ok(workflow.includes("npm audit --audit-level=low --prefix contact-worker"));
  assert.ok(workflow.includes("wrangler deploy --dry-run --outdir"));
  assert.ok(workflow.includes("wrangler deploy --dry-run --config wrangler.staging.toml"));
  assert.ok(!workflow.includes("secrets."));
});
