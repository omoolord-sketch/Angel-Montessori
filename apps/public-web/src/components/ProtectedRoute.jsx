import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDefaultRouteForRole, getLoginPathForRoute } from "../utils/domainLinks";

export default function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, user, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <div style={{ padding: 24, color: "#475569" }}>Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={getLoginPathForRoute(location.pathname)} replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return children;
}
