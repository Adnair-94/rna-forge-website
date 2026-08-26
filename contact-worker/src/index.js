const TOPICS = new Map([
  ["services", "Services and quotations"],
  ["technology", "RNAbox technology"],
  ["funding", "Funding, investment and collaboration"],
  ["privacy", "Privacy request"],
  ["other", "Other enquiry"],
]);

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow",
};

function response(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { ...SECURITY_HEADERS, ...headers } });
}

function redirect(env, path) {
  return response(null, 303, { Location: new URL(path, env.SITE_ORIGIN).toString() });
}

function splitList(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
}

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function rateLimitKey(email, request) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const input = new TextEncoder().encode(`${email.toLowerCase()}|${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyTurnstile(token, request, env, fetchImpl) {
  const payload = new FormData();
  payload.set("secret", env.TURNSTILE_SECRET);
  payload.set("response", token);
  payload.set("remoteip", request.headers.get("CF-Connecting-IP") || "");
  payload.set("idempotency_key", crypto.randomUUID());

  const verification = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: payload,
    signal: AbortSignal.timeout(5000),
  });
  if (!verification.ok) return false;

  const result = await verification.json();
  const hostnames = splitList(env.ALLOWED_HOSTNAMES);
  return result.success === true && result.action === "contact" && hostnames.has(result.hostname);
}

export async function handleRequest(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") return response("Not found", 404);
  if (!env.TURNSTILE_SECRET || !env.CONTACT_RECIPIENT || !env.CONTACT_SENDER) {
    return response("Service unavailable", 503);
  }

  const origin = request.headers.get("Origin");
  if (!splitList(env.ALLOWED_ORIGINS).has(origin)) return response("Forbidden", 403);

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 25000) return redirect(env, "/contact/error/");

  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect(env, "/contact/error/");
  }

  if (clean(form.get("company_website"), 200)) return redirect(env, "/contact/sent/");

  const name = clean(form.get("name"), 100);
  const email = clean(form.get("email"), 254);
  const organisation = clean(form.get("organisation"), 160);
  const topic = clean(form.get("topic"), 32);
  const message = clean(form.get("message"), 4000);
  const token = clean(form.get("cf-turnstile-response"), 2048);
  const consent = clean(form.get("consent"), 10);

  if (name.length < 2 || !validEmail(email) || !TOPICS.has(topic) || message.length < 20 || consent !== "yes" || !token) {
    return redirect(env, "/contact/error/");
  }

  const key = await rateLimitKey(email, request);
  const allowance = await env.CONTACT_RATE_LIMITER.limit({ key });
  if (!allowance.success) return response("Too many requests", 429, { "Retry-After": "60" });

  let verified = false;
  try {
    verified = await verifyTurnstile(token, request, env, fetchImpl);
  } catch {
    return redirect(env, "/contact/error/");
  }
  if (!verified) return response("Verification failed", 403);

  const topicLabel = TOPICS.get(topic);
  const text = [
    `RNA Forge website enquiry: ${topicLabel}`,
    "",
    `Name: ${name}`,
    `Work email: ${email}`,
    `Organisation: ${organisation || "Not supplied"}`,
    "",
    message,
  ].join("\n");
  const html = `<h1>RNA Forge website enquiry</h1><p><strong>Type:</strong> ${escapeHtml(topicLabel)}</p><p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Work email:</strong> ${escapeHtml(email)}<br><strong>Organisation:</strong> ${escapeHtml(organisation || "Not supplied")}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  try {
    await env.EMAIL.send({
      to: env.CONTACT_RECIPIENT,
      from: { email: env.CONTACT_SENDER, name: "RNA Forge website" },
      replyTo: { email, name },
      subject: `[RNA Forge website] ${topicLabel}`,
      text,
      html,
    });
  } catch (error) {
    console.error("Contact delivery failed", error?.code || "unknown");
    return redirect(env, "/contact/error/");
  }

  return redirect(env, "/contact/sent/");
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
