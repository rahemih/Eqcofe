import { Links, Meta, Scripts, ScrollRestoration } from "react-router";
import { AppShell } from "./shell/AppShell";
import { DEFAULT_LOCALE, getMessages } from "./i18n";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/state.css";

export default function Root() {
  const messages = getMessages();

  return (
    <html lang={DEFAULT_LOCALE} dir={messages.direction}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{messages.documentTitle}</title>
        <Meta />
        <Links />
      </head>
      <body>
        <AppShell />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
