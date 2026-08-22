function parseAllowedOrigins() {
  const raw = String(process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || "").trim();
  const fromEnv = raw
    ? raw.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  const out = [];
  const seen = new Set();
  for (const origin of [...fromEnv, ...defaults]) {
    const key = origin.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(origin);
  }

  return out;
}

const ALLOWED_ORIGINS = parseAllowedOrigins();

function corsOptionsDelegate(req, callback) {
  const origin = String(req.headers.origin || "").trim();

  if (!origin) {
    // Non-browser and same-origin requests.
    return callback(null, { origin: true });
  }

  const allowed = ALLOWED_ORIGINS.some((item) => item.toLowerCase() === origin.toLowerCase());
  if (!allowed) {
    return callback(null, { origin: false });
  }

  return callback(null, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");

  const isHttps = req.secure || String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";
  if (isHttps) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (req.path.startsWith("/api")) {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    );
    return next();
  }

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' http: https: ws: wss:",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  next();
}

module.exports = {
  ALLOWED_ORIGINS,
  corsOptionsDelegate,
  securityHeaders,
};
