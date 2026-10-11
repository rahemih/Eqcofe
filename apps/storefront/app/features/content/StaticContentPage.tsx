import { Link } from "react-router";
import type { FaqItem, StaticSection } from "./static-content.js";

export function StaticContentPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: readonly StaticSection[];
}) {
  return (
    <main className="content-page policy-page" aria-labelledby="static-content-title">
      <header className="content-page__hero">
        <p className="content-page__eyebrow">محتوای مصوب EQCOFE</p>
        <h1 id="static-content-title">{title}</h1>
        <p>{intro}</p>
      </header>

      <nav className="policy-page__toc" aria-label="فهرست مطالب">
        <h2>فهرست مطالب</h2>
        <ul>
          {sections.map((section) => (
            <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
          ))}
        </ul>
      </nav>

      <div className="policy-page__sections">
        {sections.map((section) => (
          <section id={section.id} key={section.id} tabIndex={-1}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </section>
        ))}
      </div>
    </main>
  );
}

export function FaqPage({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: readonly FaqItem[];
}) {
  return (
    <main className="content-page policy-page" aria-labelledby="faq-title">
      <header className="content-page__hero">
        <p className="content-page__eyebrow">راهنمای عمومی EQCOFE</p>
        <h1 id="faq-title">{title}</h1>
        <p>{intro}</p>
      </header>

      <section className="faq-list" aria-label="پرسش‌ها و پاسخ‌ها">
        {items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>

      <p className="policy-page__next">
        پاسخ موردنظر را پیدا نکردید؟ <Link to="/contact">صفحه تماس و پشتیبانی</Link> را ببینید.
      </p>
    </main>
  );
}
