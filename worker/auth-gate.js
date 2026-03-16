// FILE: worker/auth-gate.js

// Optional: operator IP allowlist (SOC / admin access)
// Enable later when needed

const ALLOWED_IPS = [
  "203.0.113.10",   // office
  "198.51.100.25",  // VPN gateway
  "192.0.2.44"      // admin workstation
];

const RATE_LIMIT = 60;        // requests
const RATE_WINDOW = 60_000;   // 1 minute

const rateMap = new Map();

function isAllowedOperatorIP(ip) {
  return ALLOWED_IPS.includes(ip);
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry) {
    rateMap.set(ip, { count: 1, start: now });
    return false;
  }

  if (now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, start: now });
    return false;
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return true;
  }

  return false;
}

function applySecurityHeaders(response) {
  const headers = new Headers(response.headers);

  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://ztr-runtime.fly.dev; img-src 'self' data:; font-src 'self';"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const url = new URL(request.url);

    // Optional SOC IP restriction
    // Uncomment when needed
    /*
    if (!isAllowedOperatorIP(ip)) {
      return new Response("Operator access restricted", { status: 403 });
    }
    */

    if (isRateLimited(ip)) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    if (url.pathname === "/") {
      return Response.redirect(url.origin + "/index.html", 302);
    }

    const response = await env.ASSETS.fetch(request);

    if (!response) {
      return new Response("Not Found", { status: 404 });
    }

    return applySecurityHeaders(response);
  }
};
