import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { handleRequest } from "../src/index.js";

const baseEnv = () => ({
  ALLOWED_HOSTNAMES: "rnaforge.com,www.rnaforge.com",
  ALLOWED_ORIGINS: "https://rnaforge.com,https://www.rnaforge.com",
  CONTACT_RECIPIENT: "private-recipient@example.test",
  CONTACT_SENDER: "website@rnaforge.com",
  SITE_ORIGIN: "https://rnaforge.com",
  TURNSTILE_SECRET: "test-secret",
  RESEND_API_KEY: "test-sending-key",
  CONTACT_DELIVERY_ENABLED: "true",
  CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) },
});

function request(overrides = {}, address = "192.0.2.1") {
  const fields = new URLSearchParams({
    name: "Ada Lovelace",
    email: "ada@example.test",
    organisation: "Example Bio",
    topic: "services",
    message: "Please contact me about a defined RNA manufacturing project.",
    consent: "yes",
    "cf-turnstile-response": "valid-token",
    ...overrides,
  });
  return new Request("https://contact.rnaforge.com/", {
    method: "POST",
    headers: { Origin: "https://rnaforge.com", "CF-Connecting-IP": address },
    body: fields,
  });
}

function provider(send = async () => Response.json({ id: "test-message" })) {
  return async (url, options) => {
    if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      return Response.json({ success: true, action: "contact", hostname: "rnaforge.com" });
    }
    assert.equal(url, "https://api.resend.com/emails");
    return send(options);
  };
}
const verified = provider();

for (const [label, start, end, now, allowed] of [
  ["missing timestamps", undefined, undefined, 1000, false],
  ["empty timestamps", "", "", 1000, false],
  ["malformed timestamp", "1000", "NaN", 1000, false],
  ["fractional timestamp", "1000", "2800.5", 1000, false],
  ["unbounded window", "1000", "2801", 1000, false],
  ["reversed window", "2800", "1000", 1500, false],
  ["future window", "1000", "2800", 999, false],
  ["opening boundary", "1000", "2800", 1000, true],
  ["inside window", "1000", "2800", 2799, true],
  ["closing boundary", "1000", "2800", 2800, false],
  ["expired window", "1000", "2800", 2801, false],
]) {
  test(`staging delivery window: ${label}`, async context => {
    context.mock.method(Date, "now", () => now * 1000);
    const env = { ...baseEnv(), CONTACT_TEST_MODE: "true", CONTACT_TEST_STARTED_AT: start, CONTACT_TEST_EXPIRES_AT: end };
    let calls = 0;
    const result = await handleRequest(request(), env, async (...args) => { calls++; return verified(...args); });
    assert.equal(result.status, allowed ? 303 : 503);
    assert.equal(calls, allowed ? 2 : 0);
    if (!allowed) assert.equal(result.headers.get("Cache-Control"), "no-store");
  });
}

test("test deadline is checked again before sending after Turnstile", async context => {
  let now = 1000;
  context.mock.method(Date, "now", () => now * 1000);
  const env = { ...baseEnv(), CONTACT_TEST_MODE: "true", CONTACT_TEST_STARTED_AT: "1000", CONTACT_TEST_EXPIRES_AT: "2800" };
  const result = await handleRequest(request(), env, async url => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    now = 2800;
    return Response.json({ success: true, action: "contact", hostname: "rnaforge.com" });
  });
  assert.equal(result.status, 503);
});

test("delivery switch still blocks an otherwise valid test window", async context => {
  context.mock.method(Date, "now", () => 1500000);
  const env = { ...baseEnv(), CONTACT_DELIVERY_ENABLED: "false", CONTACT_TEST_MODE: "true", CONTACT_TEST_STARTED_AT: "1000", CONTACT_TEST_EXPIRES_AT: "2800" };
  assert.equal((await handleRequest(request(), env, () => assert.fail("No provider calls"))).status, 503);
});

test("test-page return routes retain their isolated subdirectory", async () => {
  const env = { ...baseEnv(), SITE_ORIGIN: "https://adnair-94.github.io/rna-forge-website/delivery-test" };
  for (const [fields, page] of [[{}, "sent"], [{ message: "short" }, "error"]]) {
    const result = await handleRequest(request(fields), env, verified);
    assert.equal(result.headers.get("location"), `${env.SITE_ORIGIN}/contact/${page}/`);
  }
});

test("test workflow is manual, main-only, approved, isolated and time-limited", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/test-contact-delivery.yml", import.meta.url), "utf8");
  const staging = readFileSync(new URL("../wrangler.staging.toml", import.meta.url), "utf8");
  assert.match(staging, /CONTACT_TEST_MODE = "true"/);
  assert.match(staging, /CONTACT_TEST_STARTED_AT = "0"/);
  assert.match(staging, /CONTACT_TEST_EXPIRES_AT = "0"/);
  assert.match(staging, /CONTACT_DELIVERY_ENABLED = "false"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.ok(!/^  (push|pull_request|pull_request_target):/m.test(workflow));
  assert.equal((workflow.match(/if: github.ref == 'refs\/heads\/main'/g) || []).length, 2);
  assert.match(workflow, /needs: test/);
  assert.match(workflow, /environment: contact-production/);
  assert.match(workflow, /end=\$\(\(start \+ 1800\)\)/);
  assert.ok(workflow.includes('cp contact-worker/wrangler.staging.toml "$RUNNER_TEMP/rna-forge-contact-staging/wrangler.toml"'));
  assert.ok(!workflow.includes("cp contact-worker/wrangler.toml"));
  assert.ok(workflow.includes('workingDirectory: ${{ runner.temp }}/rna-forge-contact-staging'));
  assert.match(workflow, /CONTACT_TEST_MODE:true/);
  assert.ok(workflow.includes('CONTACT_TEST_EXPIRES_AT:${{ steps.window.outputs.end }}'));
  assert.match(workflow, /SITE_ORIGIN:https:\/\/adnair-94.github.io\/rna-forge-website\/delivery-test/);
  assert.match(workflow, /group: contact-staging-deployment/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test("rejects non-POST requests", async () => {
  const result = await handleRequest(new Request("https://contact.rnaforge.com/"), baseEnv(), verified);
  assert.equal(result.status, 404);
});

test("rejects unapproved origins", async () => {
  const result = await handleRequest(new Request("https://contact.rnaforge.com/", { method: "POST", headers: { Origin: "https://example.test" } }), baseEnv(), verified);
  assert.equal(result.status, 403);
});

test("silently accepts honeypot submissions without sending email", async () => {
  const env = baseEnv();
  let sent = false;
  const result = await handleRequest(request({ company_website: "spam.example" }), env,
    provider(async () => { sent = true; return Response.json({ id: "unexpected" }); }));
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/sent/");
  assert.equal(sent, false);
});

test("rejects invalid Turnstile results", async () => {
  const result = await handleRequest(request(), baseEnv(), async () => Response.json({ success: false }));
  assert.equal(result.status, 403);
});

test("rate limits repeated submissions before sending", async () => {
  const env = baseEnv();
  env.CONTACT_RATE_LIMITER.limit = async () => ({ success: false });
  const result = await handleRequest(request(), env, verified);
  assert.equal(result.status, 429);
  assert.equal(result.headers.get("retry-after"), "60");
});

test("sends a validated enquiry to the private recipient", async () => {
  const env = baseEnv();
  let delivered;
  const result = await handleRequest(request({ to: "attacker@example.test", from: "attacker@example.test" }), env,
    provider(async (options) => {
      assert.equal(options.method, "POST");
      assert.equal(options.redirect, "manual");
      assert.equal(options.headers.Authorization, `Bearer ${env.RESEND_API_KEY}`);
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.ok(options.signal instanceof AbortSignal);
      delivered = JSON.parse(options.body);
      return Response.json({ id: "message-1" });
    }));
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/sent/");
  assert.deepEqual(delivered.to, [env.CONTACT_RECIPIENT]);
  assert.equal(delivered.from, `RNA Forge website <${env.CONTACT_SENDER}>`);
  assert.equal(delivered.reply_to, "ada@example.test");
  assert.match(delivered.subject, /Services and quotations/);
});

test("changing email does not reset the IP allowance; other IPs remain independent", async () => {
  const env = baseEnv();
  const counts = new Map();
  let sent = 0;
  const fetchImpl = provider(async () => { sent++; return Response.json({ id: "message" }); });
  env.CONTACT_RATE_LIMITER.limit = async ({ key }) => {
    assert.match(key, /^[a-f0-9]{64}$/);
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    return { success: count <= 5 };
  };
  for (let i = 0; i < 6; i++) {
    const result = await handleRequest(request({ email: `person${i}@example.test` }), env, fetchImpl);
    assert.equal(result.status, i < 5 ? 303 : 429);
  }
  assert.equal(sent, 5);
  assert.equal(counts.size, 1);
  const other = await handleRequest(request({}, "192.0.2.2"), env, fetchImpl);
  assert.equal(other.status, 303);
  assert.equal(counts.size, 2);
});

test("rate limiting happens before reading the body or checking Turnstile", async () => {
  const env = baseEnv();
  env.CONTACT_RATE_LIMITER.limit = async () => ({ success: false });
  const incoming = request();
  const result = await handleRequest(incoming, env, () => assert.fail("Must not verify"));
  assert.equal(result.status, 429);
  assert.equal(incoming.bodyUsed, false);
});

test("rate limiter failures fail closed", async () => {
  const env = baseEnv();
  env.CONTACT_RATE_LIMITER.limit = async () => { throw new Error("Unavailable"); };
  const result = await handleRequest(request(), env, () => assert.fail("Must not verify"));
  assert.equal(result.status, 503);
});

for (const header of [null, "1", "not-a-number", "30000"]) {
  test(`rejects oversized body with Content-Length ${header}`, async () => {
    const env = baseEnv();
    const incoming = request({ padding: "x".repeat(30000) });
    if (header !== null) incoming.headers.set("Content-Length", header);
    const result = await handleRequest(incoming, env, () => assert.fail("Must not verify"));
    assert.equal(result.status, 413);
  });
}

test("accepts exactly 25000 bytes and rejects the next byte", async () => {
  const original = await request().text();
  for (const size of [25000, 25001]) {
    const body = original + "&padding=" + "x".repeat(size - original.length - 9);
    assert.equal(new TextEncoder().encode(body).byteLength, size);
    const incoming = new Request("https://contact.rnaforge.com/", {
      method: "POST",
      headers: { Origin: "https://rnaforge.com", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const result = await handleRequest(incoming, baseEnv(), verified);
    assert.equal(result.status, size === 25000 ? 303 : 413);
  }
});

test("counts UTF-8 bytes across streamed chunks and cancels at the limit", async () => {
  let cancelled = false;
  let reads = 0;
  const chunk = new TextEncoder().encode("\u00e9".repeat(5000));
  const stream = new ReadableStream({
    pull(controller) { reads++; controller.enqueue(chunk); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const incoming = new Request("https://contact.rnaforge.com/", {
    method: "POST", duplex: "half", body: stream,
    headers: { Origin: "https://rnaforge.com", "Content-Type": "application/x-www-form-urlencoded" },
  });
  const result = await handleRequest(incoming, baseEnv(), () => assert.fail("Must not verify"));
  assert.equal(result.status, 413);
  assert.equal(reads, 3);
  assert.equal(cancelled, true);
});

test("accepts bounded multipart forms", async () => {
  const fields = new FormData();
  for (const [key, value] of await request().formData()) fields.set(key, value);
  const incoming = new Request("https://contact.rnaforge.com/", {
    method: "POST", headers: { Origin: "https://rnaforge.com" }, body: fields,
  });
  const result = await handleRequest(incoming, baseEnv(), verified);
  assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/sent/");
});

test("rejects unsupported content types without verification", async () => {
  const incoming = request();
  incoming.headers.set("Content-Type", "application/json");
  const result = await handleRequest(incoming, baseEnv(), () => assert.fail("Must not verify"));
  assert.equal(result.status, 415);
});

test("handles malformed multipart bodies without delivery", async () => {
  const incoming = request();
  incoming.headers.set("Content-Type", "multipart/form-data; boundary=missing");
  const result = await handleRequest(incoming, baseEnv(), () => assert.fail("Must not verify"));
  assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/error/");
});

for (const key of ["RESEND_API_KEY", "TURNSTILE_SECRET", "CONTACT_RECIPIENT", "CONTACT_SENDER", "CONTACT_DELIVERY_ENABLED"]) {
  test(`fails closed when ${key} is missing`, async () => {
    const env = baseEnv();
    delete env[key];
    const incoming = request();
    const result = await handleRequest(incoming, env, () => assert.fail("Must not make network calls"));
    assert.equal(result.status, 503);
    assert.equal(incoming.bodyUsed, false);
  });
}

test("configured secrets alone cannot activate delivery", async () => {
  const result = await handleRequest(request(), { ...baseEnv(), CONTACT_DELIVERY_ENABLED: "false" },
    () => assert.fail("Must not make network calls"));
  assert.equal(result.status, 503);
});

for (const [label, send, stage, status, errorType] of [
  ["unauthorised", async () => Response.json({ message: "private details" }, { status: 401 }), "http_status", 401, "Error"],
  ["forbidden", async () => Response.json({ message: "private details" }, { status: 403 }), "http_status", 403, "Error"],
  ["invalid payload", async () => Response.json({ message: "private details" }, { status: 422 }), "http_status", 422, "Error"],
  ["quota exceeded", async () => Response.json({ message: "private details" }, { status: 429 }), "http_status", 429, "Error"],
  ["unavailable", async () => new Response("private details", { status: 503 }), "http_status", 503, "Error"],
  ["invalid JSON", async () => new Response("not JSON"), "response_json", 200, "SyntaxError"],
  ["missing ID", async () => Response.json({}), "delivery_id", 200, "Error"],
  ["empty ID", async () => Response.json({ id: " " }), "delivery_id", 200, "Error"],
  ["network failure", async () => { throw new Error("private details"); }, "request", null, "Error"],
  ["invalid header", async () => { throw new TypeError("private details"); }, "request", null, "TypeError"],
  ["timeout", async () => { throw new DOMException("private details", "TimeoutError"); }, "request", null, "TimeoutError"],
  ["abort", async () => { throw new DOMException("private details", "AbortError"); }, "request", null, "AbortError"],
  ["untrusted exception name", async () => { throw { name: "private details", message: "private details" }; }, "request", null, "Error"],
]) {
  test(`delivery ${label} never reports success or leaks provider errors`, async (t) => {
    const log = t.mock.method(console, "error", () => {});
    let attempts = 0;
    const result = await handleRequest(request(), baseEnv(), provider(async (options) => {
      attempts++;
      return send(options);
    }));
    assert.equal(attempts, 1, "Do not blindly retry an ambiguously accepted send");
    assert.equal(result.status, 303);
    assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/error/");
    assert.equal(await result.text(), "");
    assert.deepEqual(log.mock.calls.map(call => call.arguments), [
      ["Contact delivery failed", { stage, status, errorType }],
    ]);
  });
}

for (const status of [301, 302, 303, 307, 308]) {
  test(`rejects provider redirect ${status} without following or retrying`, async t => {
    const log = t.mock.method(console, "error", () => {});
    let sends = 0;
    const result = await handleRequest(request(), baseEnv(), provider(async options => {
      assert.equal(options.redirect, "manual");
      sends++;
      return new Response(null, { status, headers: { Location: "https://untrusted.example.test/" } });
    }));
    assert.equal(sends, 1);
    assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/error/");
    assert.deepEqual(log.mock.calls[0].arguments, [
      "Contact delivery failed", { stage: "http_status", status, errorType: "Error" },
    ]);
  });
}

for (const email of ["ada@example.test,other@example.test", "Ada <ada@example.test>", "ada@example.test\r\nBcc:other@example.test"]) {
  test(`rejects unsafe reply address ${JSON.stringify(email)}`, async () => {
    const result = await handleRequest(request({ email }), baseEnv(), () => assert.fail("Must not send"));
    assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/error/");
  });
}

test("escapes HTML and includes complete plain-text enquiry", async () => {
  let message;
  const result = await handleRequest(request({ name: "<Ada>", organisation: "A&B", message: "Please review <script>alert('test')</script> & reply." }),
    baseEnv(), provider(async options => {
      message = JSON.parse(options.body);
      return Response.json({ id: "test-message" });
    }));
  assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/sent/");
  assert.ok(!message.html.includes("<script>"));
  assert.match(message.html, /&lt;Ada&gt;/);
  assert.match(message.html, /A&amp;B/);
  assert.match(message.text, /Please review <script>/);
});

test("staging redirects retain the website subdirectory", async () => {
  const env = { ...baseEnv(), SITE_ORIGIN: "https://adnair-94.github.io/rna-forge-website" };
  for (const [fields, page] of [[{}, "sent"], [{ message: "short" }, "error"]]) {
    const result = await handleRequest(request(fields), env, verified);
    assert.equal(result.headers.get("location"), `https://adnair-94.github.io/rna-forge-website/contact/${page}/`);
  }
});

for (const verification of [
  { success: true, action: "other", hostname: "rnaforge.com" },
  { success: true, action: "contact", hostname: "attacker.example" },
]) {
  test(`rejects Turnstile scope ${JSON.stringify(verification)}`, async () => {
    const result = await handleRequest(request(), baseEnv(), async url => {
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      return Response.json(verification);
    });
    assert.equal(result.status, 403);
  });
}

test("deployment configurations declare delivery state and retain release protections", () => {
  const production = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const staging = readFileSync(new URL("../wrangler.staging.toml", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../../.github/workflows/deploy-contact-worker.yml", import.meta.url), "utf8");
  for (const config of [production, staging]) {
    assert.match(config, /CONTACT_DELIVERY_ENABLED = "(?:false|true)"/);
    assert.ok(!config.includes("[[send_email]]"));
    assert.ok(!config.includes("RESEND_API_KEY"));
  }
  assert.match(production, /workers_dev = false/);
  assert.match(production, /routes = \[/);
  assert.match(staging, /workers_dev = true/);
  assert.match(workflow, /CONTACT_HOSTING_APPROVED/);
  assert.match(workflow, /environment: contact-production/);
  assert.match(workflow, /github.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /RESEND_API_KEY: \$\{\{ secrets.RESEND_API_KEY \}\}/);
});

test("initial staging deployment requires approval and cannot enable delivery", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/deploy-contact-staging.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.ok(!/^  (push|pull_request|pull_request_target):/m.test(workflow));
  assert.equal((workflow.match(/if: github.ref == 'refs\/heads\/main'/g) || []).length, 2);
  assert.match(workflow, /needs: test/);
  assert.match(workflow, /environment: contact-production/);
  assert.match(workflow, /command: deploy --var CONTACT_DELIVERY_ENABLED:false/);
  assert.ok(workflow.includes('cp contact-worker/wrangler.staging.toml "$RUNNER_TEMP/rna-forge-contact-staging/wrangler.toml"'));
  assert.ok(workflow.includes('workingDirectory: ${{ runner.temp }}/rna-forge-contact-staging'));
  assert.ok(!workflow.includes("CONTACT_HOSTING_APPROVED"));
  assert.ok(!workflow.includes("cp contact-worker/wrangler.toml"));
  assert.match(workflow, /cancel-in-progress: false/);
  for (const name of ["TURNSTILE_SECRET", "CONTACT_RECIPIENT", "CONTACT_SENDER", "RESEND_API_KEY", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) {
    assert.ok(workflow.includes(`secrets.${name}`));
  }
});
