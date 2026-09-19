import { Link, Outlet } from "react-router";
import { getMessages } from "../i18n";
import { Breadcrumbs } from "./Breadcrumbs";
import { PrimaryNavigation } from "./PrimaryNavigation";

export function AppShell() {
  const messages = getMessages();

  return (
    <>
      <a className="skip-link" href="#main-content">{messages.skipToContent}</a>

      <header className="site-header">
        <div className="site-header__inner eq-container">
          <Link className="wordmark-slot" to="/" aria-label={messages.nav.home}>
            <span className="wordmark-slot__name">{messages.brandName}</span>
            <span className="wordmark-slot__subtitle">{messages.brandSubtitle}</span>
          </Link>

          <Link className="header-search" to="/search">{messages.header.search}</Link>

          <div className="header-actions" aria-label="دسترسی سریع">
            <Link to="/cart">{messages.header.cart}</Link>
            <Link to="/account">{messages.header.account}</Link>
          </div>
        </div>

        <PrimaryNavigation />
      </header>

      <Breadcrumbs />

      <main id="main-content" className="main-content eq-container" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner eq-container">
          <section aria-labelledby="footer-info-title">
            <h2 id="footer-info-title">{messages.footer.information}</h2>
            <ul>
              <li><Link to="/about">{messages.footer.about}</Link></li>
              <li><Link to="/contact">{messages.footer.contact}</Link></li>
            </ul>
          </section>

          <section aria-labelledby="footer-support-title">
            <h2 id="footer-support-title">{messages.footer.support}</h2>
            <ul>
              <li><Link to="/faq">{messages.footer.faq}</Link></li>
              <li><Link to="/policies/terms">{messages.footer.terms}</Link></li>
              <li><Link to="/policies/returns-warranty">{messages.footer.returnsWarranty}</Link></li>
            </ul>
          </section>

          <p className="site-footer__copyright">{messages.footer.copyright}</p>
        </div>
      </footer>
    </>
  );
}
