import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCanonicalUrlForPath } from "../utils/domainLinks";

export default function DomainBoundary({ children }) {
  const location = useLocation();
  const redirectUrl = getCanonicalUrlForPath(location.pathname, location.search, location.hash);

  useEffect(() => {
    if (redirectUrl && typeof window !== "undefined") {
      window.location.replace(redirectUrl);
    }
  }, [redirectUrl]);

  if (redirectUrl) {
    return <div style={{ padding: 24, color: "#475569" }}>Redirecting to the right school workspace...</div>;
  }

  return children;
}
