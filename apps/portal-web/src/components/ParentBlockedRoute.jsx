import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ParentBlockedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role === "PARENT") {
    return <Navigate to="/portal/parent" replace />;
  }

  return children;
}
