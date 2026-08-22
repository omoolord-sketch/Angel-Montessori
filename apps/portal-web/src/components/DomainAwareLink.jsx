import { Link } from "react-router-dom";
import { isAbsoluteUrl, resolveDomainLink } from "../utils/domainLinks";

export default function DomainAwareLink({ to, children, ...props }) {
  if (typeof to !== "string") {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  }

  const resolvedTarget = resolveDomainLink(to);

  if (isAbsoluteUrl(resolvedTarget)) {
    return (
      <a href={resolvedTarget} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link to={resolvedTarget} {...props}>
      {children}
    </Link>
  );
}
