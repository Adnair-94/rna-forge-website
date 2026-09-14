import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";

const baseEnv = () => ({
  ALLOWED_HOSTNAMES: "rnaforge.com,www.rnaforge.com",
  ALLOWED_ORIGINS: "https://rnaforge.com,https://www.rnaforge.com",
  CONTACT_RECIPIENT: "private-recipient@example.test",
  CONTACT_SENDER: "website@rnaforge.com",
  SITE_ORIGIN: "https://rnaforge.com",
  TURNSTILE_SECRET: "test-secret",
  CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) },
  EMAIL: { send: async () => ({ messageId: "test-message" }) },
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

const verified = async () => Response.json({ success: true, action: "contact", hostname: "rnaforge.com" });

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
  env.EMAIL.send = async () => { sent = true; };
  const result = await handleRequest(request({ company_website: "spam.example" }), env, verified);
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
  env.EMAIL.send = async (message) => { delivered = message; return { messageId: "message-1" }; };
  const result = await handleRequest(request(), env, verified);
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "https://rnaforge.com/contact/sent/");
  assert.equal(delivered.to, env.CONTACT_RECIPIENT);
  assert.equal(delivered.replyTo.email, "ada@example.test");
  assert.match(delivered.subject, /Services and quotations/);
});

test("changing email does not reset the IP allowance; other IPs remain independent", async () => {
  const env = baseEnv();
  const counts = new Map();
  let sent = 0;
  env.EMAIL.send = async () => { sent++; };
  env.CONTACT_RATE_LIMITER.limit = async ({ key }) => {
    assert.match(key, /^[a-f0-9]{64}$/);
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    return { success: count <= 5 };
  };
  for (let i = 0; i < 6; i++) {
    const result = await handleRequest(request({ email: `person${i}@example.test` }), env, verified);
    assert.equal(result.status, i < 5 ? 303 : 429);
  }
  assert.equal(sent, 5);
  assert.equal(counts.size, 1);
  const other = await handleRequest(request({}, "192.0.2.2"), env, verified);
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
  env.EMAIL.send = () => assert.fail("Must not deliver");
  const result = await handleRequest(request(), env, () => assert.fail("Must not verify"));
  assert.equal(result.status, 503);
});

for (const header of [null, "1", "not-a-number", "30000"]) {
  test(`rejects oversized body with Content-Length ${header}`, async () => {
    const env = baseEnv();
    env.EMAIL.send = () => assert.fail("Must not deliver");
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
