import * as jose from "jose";

export default {
  async fetch(request, env) {
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
