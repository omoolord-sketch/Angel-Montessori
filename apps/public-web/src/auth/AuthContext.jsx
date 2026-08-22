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

    async function validateSession() {
      if (!token) {
        if (!active) return;
        setAuthReady(true);
        return;
      }

      if (active) setAuthReady(false);
      try {
        const res = await API.get("/auth/me");
        const nextUser = res.data?.user || getStoredUser();
        if (!active) return;
        saveAuthSession(token, nextUser);
        setUser(nextUser);
      } catch {
        clearAuthSession();
        if (!active) return;
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
    return nextUser;
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
    setAuthReady(true);
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), authReady, login, logout }),
    [token, user, authReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}