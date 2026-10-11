import { Link } from "react-router";
import type { StaticPageContent } from "./static-content.js";

export function StaticInfoPage({
  content,
  actions = [],
}: {
  content: StaticPageContent;
  actions?: readonly { to: string; label: string }[];
}) {
  return (
    <main className="content-page static-info-page" aria-labelledby="static-page-title">
      <header className="content-page__hero">
        <p className="content-page__eyebrow">{content.eyebrow}</p>
        <h1 id="static-page-title">{content.title}</h1>
        <p>{content.intro}</p>
      </header>

      {content.notice ? (
        <aside className="static-info-page__notice" aria-label="توضیح مهم">
          <p>{content.notice}</p>
        </aside>
      ) : null}

      <div className="static-info-page__sections">
        {content.sections.map((section) => (
          <section key={section.heading} className="static-info-page__section">
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? (
              <ul>
                {section.bullets.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {actions.length > 0 ? (
        <nav className="static-info-page__actions" aria-label="مسیرهای مرتبط">
          {actions.map((action) => (
            <Link key={action.to} className="content-page__action" to={action.to}>{action.label}</Link>
          ))}
        </nav>
      ) : null}
    </main>
  );
}
