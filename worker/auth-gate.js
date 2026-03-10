import * as jose from "jose";

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

export default {
  async fetch(request, env) {

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

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

    const url = new URL(request.url);

    const protectedRoutes = ["/shield", "/copilot", "/console"];
    const isProtected = protectedRoutes.some((p) =>
      url.pathname === p || url.pathname.startsWith(p + "/")
    );

    // Allow all public routes
    if (!isProtected) {
      return env.ASSETS.fetch(request);
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorizedRedirect("required");
    }

    const token = authHeader.slice(7);

    try {

      const payload = await verifyToken(token);

      if (!payload || payload.exp * 1000 < Date.now()) {
        throw new Error("expired");
      }

      // You can refine scope logic here (if needed)
      if (!payload.scope?.includes("controlplane:access")) {
        throw new Error("invalid-scope");
      }

      const newHeaders = new Headers(request.headers);
      newHeaders.set("X-STC-Tenant", payload.tenant_id || "");

      const newReq = new Request(request, { headers: newHeaders });

      return env.ASSETS.fetch(newReq);

    } catch (err) {

      return unauthorizedRedirect("invalid");

    }
  }
};

function unauthorizedRedirect(reason) {

  return Response.redirect(
    `https://app.securethecloud.dev/?auth=${reason}`,
    302
  );

}

async function verifyToken(token) {

  const jwksUri = "https://ztr-runtime.fly.dev/.well-known/jwks.json";

  const jwks = jose.createRemoteJWKSet(new URL(jwksUri));

  const { payload } = await jose.jwtVerify(token, jwks, {
    algorithms: ["RS256"],
  });

  return payload;

}
