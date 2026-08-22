function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeApiBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getRootHostname(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  return normalized.replace(/^(www|portal|api)\./, "");
}

function getWindowRuntimeConfig() {
  if (typeof window === "undefined") return {};
  const raw = window.__AMS_RUNTIME_CONFIG__;
  return raw && typeof raw === "object" ? raw : {};
}

function isLocalHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function deriveBrowserConfig() {
  if (typeof window === "undefined") return {};

  const { protocol, hostname, port } = window.location;
  const origin = normalizeOrigin(window.location.origin);
  if (!origin) return {};

  if (hostname.startsWith("portal.")) {
    const rootHost = getRootHostname(hostname);
    return {
      publicSiteUrl: normalizeOrigin(`${protocol}//${rootHost}`),
      portalUrl: origin,
      apiBaseUrl: normalizeApiBaseUrl(`${protocol}//api.${rootHost}/api`),
    };
  }

  if (isLocalHostname(hostname)) {
    const browserBase = normalizeOrigin(`${protocol}//${hostname}${port ? `:${port}` : ""}`);
    const apiPort = port === "3000" ? "6060" : port || "6060";
    return {
      publicSiteUrl: browserBase,
      portalUrl: browserBase,
      apiBaseUrl: normalizeApiBaseUrl(`${protocol}//${hostname}:${apiPort}/api`),
    };
  }

  const rootHost = getRootHostname(hostname);
  const publicSiteUrl = origin;
  const portalUrl = normalizeOrigin(`${protocol}//portal.${rootHost}`);
  return {
    publicSiteUrl,
    portalUrl,
    apiBaseUrl: normalizeApiBaseUrl(`${protocol}//api.${rootHost}/api`),
  };
}

export function getRuntimeConfig() {
  const browserConfig = deriveBrowserConfig();
  const runtimeConfig = getWindowRuntimeConfig();

  const publicSiteUrl = normalizeOrigin(
    runtimeConfig.PUBLIC_SITE_URL ||
      runtimeConfig.publicSiteUrl ||
      process.env.REACT_APP_PUBLIC_SITE_URL ||
      browserConfig.publicSiteUrl ||
      ""
  );

  const portalUrl = normalizeOrigin(
    runtimeConfig.PORTAL_URL ||
      runtimeConfig.portalUrl ||
      process.env.REACT_APP_PORTAL_URL ||
      browserConfig.portalUrl ||
      ""
  );

  const apiBaseUrl = normalizeApiBaseUrl(
    runtimeConfig.API_BASE_URL ||
      runtimeConfig.apiBaseUrl ||
      process.env.REACT_APP_API_BASE_URL ||
      browserConfig.apiBaseUrl ||
      "/api"
  );

  return {
    publicSiteUrl,
    portalUrl,
    apiBaseUrl,
  };
}

export function getConfiguredPublicSiteUrl() {
  return getRuntimeConfig().publicSiteUrl;
}

export function getConfiguredPortalUrl() {
  return getRuntimeConfig().portalUrl;
}

export function getConfiguredApiBaseUrl() {
  return getRuntimeConfig().apiBaseUrl;
}
