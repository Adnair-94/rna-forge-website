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

function request(overrides = {}) {
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
    headers: { Origin: "https://rnaforge.com" },
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
