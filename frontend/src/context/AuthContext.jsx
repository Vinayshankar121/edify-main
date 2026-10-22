import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, clearAccessToken, getAccessToken, setAccessToken } from "@/lib/api";
import { clearCollectionCache } from "@/lib/store";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const onUnauthorized = () => setUser(null);
    window.addEventListener("edify:unauthorized", onUnauthorized);
    const token = getAccessToken();
    if (!token) {
      setReady(true);
      return () => {
        mounted = false;
        window.removeEventListener("edify:unauthorized", onUnauthorized);
      };
    }
    apiRequest("/auth/me")
      .then(({ user: currentUser }) => {
        if (mounted) setUser(currentUser);
      })
      .catch(() => clearAccessToken())
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
      window.removeEventListener("edify:unauthorized", onUnauthorized);
    };
  }, []);
  const login = useCallback(async (username, password) => {
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: { username: username.trim(), password },
      });
      setAccessToken(result.token);
      setUser(result.user);
      return { ok: true, user: result.user };
    } catch (error) {
      return { ok: false, error: error.message || "Unable to sign in." };
    }
  }, []);
  const logout = useCallback(() => {
    clearAccessToken();
    clearCollectionCache();
    setUser(null);
  }, []);
  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
