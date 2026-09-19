import { Link, useMatches } from "react-router";
import { getMessages } from "../i18n";

type ShellRouteHandle = {
  breadcrumb?: string;
};

export function Breadcrumbs() {
  const messages = getMessages();
  const matches = useMatches();
  const current = [...matches]
    .reverse()
    .map((match) => match.handle as ShellRouteHandle | undefined)
    .find((handle) => handle?.breadcrumb)?.breadcrumb;

  if (!current || current === messages.nav.home) return null;

  return (
    <nav className="breadcrumbs eq-container" aria-label={messages.breadcrumbLabel}>
      <ol>
        <li><Link to="/">{messages.nav.home}</Link></li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
