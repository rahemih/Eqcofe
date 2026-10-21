import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { DEFAULT_LOCALE, getAdminMessages } from "./i18n";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/foundation.css";
import "./styles/states.css";
import "./styles/auth.css";\nimport "./styles/pricing.css";

export const meta = () => [{ title: getAdminMessages().documentTitle }];

export default function Root() {
  const messages = getAdminMessages();
  return (
    <html lang={DEFAULT_LOCALE} dir={messages.direction}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
