import { getConfiguredPortalUrl, getConfiguredPublicSiteUrl } from "../config/runtimeConfig";

const APPLICANT_PREFIXES = [
  "/admissions/login",
  "/admissions/register",
  "/admissions/apply",
  "/applicant",
  "/portal/applicant",
];

const PORTAL_ONLY_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/change-password",
  "/portal",
  "/dashboard",
  "/teacher",
  "/student",
  "/parent",
  "/admin",
];

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizePath(pathname) {
  const raw = String(pathname || "").trim();
  if (!raw) return "/";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/{2,}/g, "/");
}

function matchesPrefix(pathname, prefix) {
  const normalizedPath = normalizePath(pathname);
  return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
}

export function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

export function isApplicantPath(pathname) {
  return APPLICANT_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isPortalOnlyPath(pathname) {
  if (isApplicantPath(pathname)) return false;
  return PORTAL_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function getBrowserOrigin() {
  if (typeof window === "undefined") return "";
  return normalizeOrigin(window.location.origin);
}

export function getPublicSiteUrl(pathname = "/") {
  const path = normalizePath(pathname);
  const publicSiteOrigin = normalizeOrigin(getConfiguredPublicSiteUrl());
  return publicSiteOrigin ? `${publicSiteOrigin}${path}` : path;
}

export function getPortalUrl(pathname = "/") {
  const path = normalizePath(pathname);
  const portalOrigin = normalizeOrigin(getConfiguredPortalUrl());
  return portalOrigin ? `${portalOrigin}${path}` : path;
}

export function getApplicantLoginPath() {
  return "/admissions/login";
}

export function getLoginPathForRoute(pathname = "/") {
  return isApplicantPath(pathname) ? getApplicantLoginPath() : "/login";
}

export function getDefaultRouteForRole(roleOrUser) {
  const role = String(typeof roleOrUser === "object" ? roleOrUser?.role : roleOrUser).trim().toUpperCase();
  const applicantType = typeof roleOrUser === "object"
    ? String(roleOrUser?.applicantType || "").trim().toUpperCase()
    : "";

  if (role === "STUDENT") return "/portal/student";
  if (role === "PARENT") return "/portal/parent";
  if (role === "APPLICANT") return applicantType === "RECRUITMENT" ? "/applicant/recruitment" : "/applicant/dashboard";
  return "/portal";
}

export function resolveDomainLink(target) {
  if (typeof target !== "string" || !target.trim()) return target;
  if (isAbsoluteUrl(target)) return target;

  const path = normalizePath(target);
  const currentOrigin = getBrowserOrigin();
  const portalOrigin = normalizeOrigin(getConfiguredPortalUrl());
  const publicSiteOrigin = normalizeOrigin(getConfiguredPublicSiteUrl());

  if (isPortalOnlyPath(path) && portalOrigin && currentOrigin !== portalOrigin) {
    return `${portalOrigin}${path}`;
  }

  if (!isPortalOnlyPath(path) && publicSiteOrigin && currentOrigin === portalOrigin) {
    return `${publicSiteOrigin}${path}`;
  }

  return path;
}

export function getCanonicalUrlForPath(pathname = "/", search = "", hash = "") {
  const path = normalizePath(pathname);
  const currentOrigin = getBrowserOrigin();
  const requiredOrigin = isPortalOnlyPath(path)
    ? normalizeOrigin(getConfiguredPortalUrl())
    : normalizeOrigin(getConfiguredPublicSiteUrl());

  if (!requiredOrigin || !currentOrigin || currentOrigin === requiredOrigin) {
    return "";
  }

  return `${requiredOrigin}${path}${search || ""}${hash || ""}`;
}
