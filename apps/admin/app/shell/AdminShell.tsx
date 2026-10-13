import { Outlet } from "react-router";
import { getAdminMessages } from "../i18n";

export function AdminShell() {
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
          <span className="admin-stage-badge" aria-label="مرحله جاری">67-C</span>
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
