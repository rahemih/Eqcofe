import { Link, useOutletContext } from "react-router";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState";
import type { AdminShellOutletContext } from "../shell/AdminShell";

export default function AdminFoundationRoute() {
  const { groups } = useOutletContext<AdminShellOutletContext>();

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <header className="dashboard-heading">
        <p className="foundation-kicker">مرحله 67-G</p>
        <h1 id="dashboard-title">نمای کلی مدیریت</h1>
        <p>این صفحه فقط مسیرهای مجاز و وضعیت‌های ایمن پوسته را ارائه می‌کند. نمایش مقصد به معنی مجوز اجرای عملیات آن نیست.</p>
      </header>

      <AdminSurfaceState
        kind="unavailable"
        description="نمای کلی داده‌ای هنوز مرجع runtime و permission قابل اتکا ندارد؛ بنابراین این صفحه فقط مقصدهای مجاز فعلی را نشان می‌دهد."
      />

      <section className="dashboard-destinations" aria-labelledby="dashboard-destinations-title">
        <div className="dashboard-section-heading">
          <h2 id="dashboard-destinations-title">مسیرهای مجاز برای ادامه کار</h2>
          <p>این لینک‌ها فقط از مقصدهایی ساخته می‌شوند که پوسته از زمینهٔ تأییدشدهٔ سرور دریافت کرده است.</p>
        </div>

        {groups.length ? (
          <div className="dashboard-destination-groups">
            {groups.map((group) => (
              <section className="dashboard-destination-group" key={group.id} aria-labelledby={"dashboard-group-" + group.id}>
                <h3 id={"dashboard-group-" + group.id}>{group.label}</h3>
                <ul>
                  {group.destinations.map((destination) => (
                    <li key={destination.surface}>
                      <Link to={"/destinations/" + encodeURIComponent(destination.surface)}>
                        <span>{destination.label}</span>
                        <bdi>{destination.surface}</bdi>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <AdminSurfaceState
            kind="empty"
            compact
            title="مسیر مجازی برای این زمینه نمایش داده نمی‌شود"
            description="پوسته بدون شواهد مجوز معتبر مقصد تازه‌ای ایجاد نمی‌کند. تغییر نقش یا دامنه نیز از داخل این صفحه انجام نمی‌شود."
          />
        )}
      </section>
    </section>
  );
}
