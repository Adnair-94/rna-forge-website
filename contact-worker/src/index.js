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
  const base = `${env.SITE_ORIGIN.replace(/\/$/, "")}/`;
  return response(null, 303, { Location: new URL(path.replace(/^\//, ""), base).toString() });
}

function splitList(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
}

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value);
}

function deliveryAllowed(env) {
  if (env.CONTACT_DELIVERY_ENABLED !== "true") return false;
  if (env.CONTACT_TEST_MODE !== "true") return true;
  const start = Number(env.CONTACT_TEST_STARTED_AT);
  const end = Number(env.CONTACT_TEST_EXPIRES_AT);
  const now = Date.now() / 1000;
  return /^\d+$/.test(env.CONTACT_TEST_STARTED_AT || "") &&
    /^\d+$/.test(env.CONTACT_TEST_EXPIRES_AT || "") &&
    Number.isSafeInteger(start) && Number.isSafeInteger(end) &&
    end > start && end - start <= 1800 && now >= start && now < end;
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

async function rateLimitKey(request) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const input = new TextEncoder().encode(`contact-ip|${address}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const MAX_BODY_BYTES = 25000;
class BodyTooLargeError extends Error {}

async function boundedFormData(request, contentType) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const bytes = new Uint8Array(MAX_BODY_BYTES);
  let size = 0;
  try {
    // Bound the bytes before parsing, including requests without Content-Length.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > MAX_BODY_BYTES - size) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  return new Response(bytes.subarray(0, size), {
    headers: { "Content-Type": contentType },
  }).formData();
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
  if (!deliveryAllowed(env) || !env.TURNSTILE_SECRET || !env.RESEND_API_KEY ||
      !validEmail(env.CONTACT_RECIPIENT) || !validEmail(env.CONTACT_SENDER)) {
    return response("Service unavailable", 503);
  }

  const origin = request.headers.get("Origin");
  if (!splitList(env.ALLOWED_ORIGINS).has(origin)) return response("Forbidden", 403);

  try {
    const key = await rateLimitKey(request);
    const allowance = await env.CONTACT_RATE_LIMITER.limit({ key });
    if (!allowance.success) return response("Too many requests", 429, { "Retry-After": "60" });
  } catch {
    return response("Service unavailable", 503);
  }

  const contentType = request.headers.get("Content-Type") || "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (!["application/x-www-form-urlencoded", "multipart/form-data"].includes(mediaType)) {
    return response("Unsupported media type", 415);
  }
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) return response("Request too large", 413);

  let form;
  try {
    form = await boundedFormData(request, contentType);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return response("Request too large", 413);
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

  let verified = false;
  try {
    verified = await verifyTurnstile(token, request, env, fetchImpl);
  } catch {
    return redirect(env, "/contact/error/");
  }
  if (!verified) return response("Verification failed", 403);

  // A request may have crossed the test deadline while its challenge was verified.
  if (!deliveryAllowed(env)) return response("Service unavailable", 503);

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

  let deliveryStage = "request";
  let deliveryStatus = null;
  try {
    const delivery = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        to: [env.CONTACT_RECIPIENT],
        from: `RNA Forge website <${env.CONTACT_SENDER}>`,
        reply_to: email,
        subject: `[RNA Forge website] ${topicLabel}`,
        text,
        html,
      }),
    });
    deliveryStatus = delivery.status;
    deliveryStage = "http_status";
    if (!delivery.ok) throw new Error("Delivery rejected");
    deliveryStage = "response_json";
    const result = await delivery.json();
    deliveryStage = "delivery_id";
    if (typeof result.id !== "string" || !result.id.trim()) throw new Error("Missing delivery ID");
  } catch (error) {
    // Only fixed categories and HTTP status: never log provider bodies or exception messages.
    const errorType = ["TimeoutError", "AbortError", "TypeError", "SyntaxError"].includes(error?.name)
      ? error.name : "Error";
    console.error("Contact delivery failed", {
      stage: deliveryStage,
      status: deliveryStatus,
      errorType,
    });
    return redirect(env, "/contact/error/");
  }

  return redirect(env, "/contact/sent/");
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
