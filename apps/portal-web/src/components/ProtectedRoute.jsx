import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForRole, getLoginPathForRoute } from "../utils/domainLinks";
import { matchesRoleAccess } from "../utils/roleHelpers";

export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <div style={{ padding: 24, color: "#475569" }}>Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={getLoginPathForRoute(location.pathname)} replace state={{ from: location.pathname }} />;
  }

  const passwordChangePath = location.pathname === "/change-password" || location.pathname === "/portal/change-password";
  if (user?.mustChangePassword && !passwordChangePath) {
    return <Navigate to="/portal/change-password" replace state={{ from: location.pathname }} />;
  }

  if (roles && !matchesRoleAccess(user?.role, roles)) {
    return <Navigate to={getDefaultRouteForRole(user)} replace />;
  }

  return children;
}
