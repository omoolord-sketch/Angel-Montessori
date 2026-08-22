import { createContext, useContext, useEffect, useMemo, useState } from "react";
import API, {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  registerAuthFailureHandler,
  saveAuthSession,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(getStoredUser());
  const [authReady, setAuthReady] = useState(!getStoredToken());

  useEffect(() => {
    registerAuthFailureHandler(() => {
      setToken(null);
      setUser(null);
      setAuthReady(true);
    });

    return () => {
      registerAuthFailureHandler(null);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const validatingToken = token;

    async function validateSession() {
      if (!validatingToken) {
        if (!active) return;
        setAuthReady(true);
        return;
      }

      if (active) setAuthReady(false);
      try {
        const res = await API.get("/auth/me");
        const nextUser = res.data?.user || getStoredUser();
        if (!active) return;
        if (getStoredToken() !== validatingToken) return;
        saveAuthSession(validatingToken, nextUser);
        setUser(nextUser);
      } catch (error) {
        if (!active) return;
        const storedToken = getStoredToken();
        if (storedToken && storedToken !== validatingToken) return;

        const status = Number(error?.response?.status || 0);
        const message = String(error?.response?.data?.message || "").toLowerCase();
        const isInvalidSession =
          status === 401 &&
          (message.includes("invalid token") || message.includes("unauthorized"));
        const fallbackUser = getStoredUser();

        if (!isInvalidSession && storedToken && fallbackUser) {
          setUser(fallbackUser);
          return;
        }

        clearAuthSession();
        setToken(null);
        setUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    }

    validateSession();
    return () => {
      active = false;
    };
  }, [token]);

  const login = async (username, password) => {
    const res = await API.post("/auth/login", { username, password });
    const nextToken = res.data?.token;
    const nextUser = res.data?.user;
    saveAuthSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setAuthReady(true);
    return { ...nextUser, _sessionToken: nextToken };
  };

  const changePassword = async (currentPassword, newPassword, sessionTokenOverride = "") => {
    const overrideToken = String(sessionTokenOverride || "").trim();
    const config = overrideToken ? { headers: { Authorization: `Bearer ${overrideToken}` } } : undefined;
    const res = await API.post("/auth/change-password", { currentPassword, newPassword }, config);
    const nextToken = res.data?.token;
    const nextUser = res.data?.user;
    saveAuthSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setAuthReady(true);
    return nextUser;
  };

  const changeTemporaryPassword = async (username, currentPassword, newPassword, sessionTokenOverride = "") => {
    let res;
    const overrideToken = String(sessionTokenOverride || "").trim();
    const config = overrideToken ? { headers: { Authorization: `Bearer ${overrideToken}` } } : undefined;

    try {
      // This endpoint authenticates with username + temporary password.
      // Avoid adding an Authorization header here because some shared-hosting CORS
      // setups reject the preflight even though normal login requests work.
      res = await API.post(
        "/auth/change-temporary-password",
        { username, currentPassword, newPassword },
        { skipAuth: true }
      );
    } catch (error) {
      try {
        res = await API.post("/auth/change-password", { currentPassword, newPassword }, config);
      } catch (fallbackError) {
        throw fallbackError?.response ? fallbackError : error;
      }
    }

    const nextToken = res.data?.token;
    const nextUser = res.data?.user;
    saveAuthSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setAuthReady(true);
    return nextUser;
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
    setAuthReady(true);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      authReady,
      login,
      changePassword,
      changeTemporaryPassword,
      logout,
    }),
    [token, user, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
