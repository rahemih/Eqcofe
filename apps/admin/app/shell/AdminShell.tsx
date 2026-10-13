import { Form, Outlet } from "react-router";
import type { AdminSessionActor } from "../platform/auth/session.server";
import { getAdminMessages } from "../i18n";

export function AdminShell({actor}:{actor:AdminSessionActor}) {
  const messages = getAdminMessages();
  return (
    <>
      <a className="admin-skip-link" href="#admin-main">{messages.skipToMain}</a>
      <div className="admin-frame">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">{messages.foundationStatus}</p>
            <p className="admin-brand">{messages.brand}</p>
          </div>
          <div className="admin-session-summary">
            <span className="admin-stage-badge" aria-label="مرحله جاری">67-D</span>
            <span className="admin-actor" title="نشست تأییدشده">مدیر <bdi>{actor.id}</bdi></span>
            <Form method="post" action="/logout">
              <button className="admin-logout-button" type="submit">خروج امن</button>
            </Form>
          </div>
        </header>
        <aside className="admin-sidebar">
          <nav aria-label={messages.navigationLabel}>
            <p className="admin-nav-title">{messages.navigationLabel}</p>
            <p className="admin-nav-note">{messages.navigationDeferred}</p>
          </nav>
        </aside>
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
