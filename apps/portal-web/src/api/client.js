import axios from "axios";
import { getConfiguredApiBaseUrl } from "../config/runtimeConfig";

const TOKEN_KEY = "ams_token";
const USER_KEY = "ams_user";
const AUTH_NOTICE_KEY = "ams_auth_notice";
const apiBaseUrl = getConfiguredApiBaseUrl();

let authFailureHandler = null;

const API = axios.create({
  baseURL: apiBaseUrl,
});

API.interceptors.request.use((config) => {
  if (config?.skipAuth) {
    config.headers = config.headers || {};
    delete config.headers.Authorization;
    delete config.headers.authorization;
    delete config.skipAuth;
    config._amsAuthTokenAtRequest = "";
    return config;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const existingAuthorization = config.headers?.Authorization || config.headers?.authorization;

  if (token && !existingAuthorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    config._amsAuthTokenAtRequest = token;
  } else if (existingAuthorization) {
    config._amsAuthTokenAtRequest = String(existingAuthorization).replace(/^Bearer\s+/i, "");
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    const message = String(error?.response?.data?.message || "").toLowerCase();
    const requestUrl = String(error?.config?.url || "");
    const isAuthError = status === 401 && (message.includes("invalid token") || message.includes("unauthorized"));
    const isLoginRequest = requestUrl.includes("/auth/login");
    const tokenAtRequest = String(error?.config?._amsAuthTokenAtRequest || "");
    const currentToken = String(localStorage.getItem(TOKEN_KEY) || "");
    const requestUsedCurrentSession = tokenAtRequest && tokenAtRequest === currentToken;

    if (isAuthError && !isLoginRequest && requestUsedCurrentSession) {
      clearAuthSession();
      try {
        window.sessionStorage.setItem(AUTH_NOTICE_KEY, "Your session expired. Please sign in again.");
      } catch {
        // Ignore browser storage failures.
      }
      if (typeof authFailureHandler === "function") {
        authFailureHandler(error);
      }
    }

    return Promise.reject(error);
  }
);

export function saveAuthSession(token, user) {
  if (!token || !user) {
    throw new Error("Login session was not returned by the server. Please try again.");
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthNotice() {
  try {
    const notice = window.sessionStorage.getItem(AUTH_NOTICE_KEY) || "";
    if (notice) window.sessionStorage.removeItem(AUTH_NOTICE_KEY);
    return notice;
  } catch {
    return "";
  }
}

export function registerAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === "function" ? handler : null;
}

export default API;
