import { useState } from "react";
import { NavLink } from "react-router";
import { getMessages } from "../i18n";

const destinations = [
  { to: "/", labelKey: "home", end: true },
  { to: "/search", labelKey: "shop", end: false },
  { to: "/compare", labelKey: "compare", end: false },
  { to: "/articles", labelKey: "articles", end: false },
  { to: "/cart", labelKey: "cart", end: false },
  { to: "/account", labelKey: "account", end: false },
] as const;

export function PrimaryNavigation() {
  const messages = getMessages();
  const [open, setOpen] = useState(false);

  return (
    <nav className="primary-navigation eq-container" aria-label={messages.navLabel}>
      <button
        className="nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="primary-navigation-list"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">☰</span>
        <span>{open ? messages.navToggleClose : messages.navToggleOpen}</span>
      </button>

      <ul id="primary-navigation-list" className="primary-navigation__list" data-open={open ? "true" : "false"}>
        {destinations.map(({ to, labelKey, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => isActive ? "is-active" : undefined}
            >
              {messages.nav[labelKey]}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
