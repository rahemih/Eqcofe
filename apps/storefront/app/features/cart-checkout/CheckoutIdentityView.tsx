import { Form, Link } from "react-router";
import { StatePanel } from "../../components/StatePanel.js";
import type { CustomerSessionState } from "../../platform/auth/protected-route.js";
import type { CheckoutIdentityActionData } from "./checkout-identity.server.js";

export function CheckoutIdentityView({
  session,
  actionData,
  busy,
}: {
  session: CustomerSessionState;
  actionData: CheckoutIdentityActionData | null;
  busy: boolean;
}) {
  const challengeId = actionData && "challengeId" in actionData ? actionData.challengeId : undefined;
  const otpMode = actionData?.status === "otp-requested"
    || (Boolean(challengeId) && (actionData?.status === "validation" || actionData?.status === "rate-limited" || actionData?.status === "recovery"));

  return (
    <div className="checkout-identity">
      <header className="checkout-identity__intro">
        <p className="checkout-identity__step">مرحله ۲ از ۵</p>
        <h1>ورود و هویت تسویه‌حساب</h1>
        <p>هویت شما پیش از نشانی، سفارش و پرداخت به‌صورت authoritative تأیید می‌شود.</p>
      </header>

      {actionData ? (
        <div
          className="checkout-identity__feedback"
          role={actionData.status === "otp-requested" ? "status" : "alert"}
          aria-live={actionData.status === "otp-requested" ? "polite" : "assertive"}
          data-feedback={actionData.status}
        >
          {actionData.message}
          {"requestId" in actionData && actionData.requestId ? (
            <span className="checkout-identity__request-id">
              شناسه پیگیری: <bdi dir="ltr">{actionData.requestId}</bdi>
            </span>
          ) : null}
        </div>
      ) : null}

      {session.status === "authenticated" && !otpMode ? (
        <section className="checkout-identity__card" aria-labelledby="identity-session-title">
          <h2 id="identity-session-title">نشست شما معتبر است</h2>
          <p>برای اتصال امن سبد جاری به حساب و ادامه تسویه‌حساب اقدام کنید.</p>
          <Form method="post">
            <input type="hidden" name="intent" value="continue-authenticated" />
            <button type="submit" disabled={busy}>اتصال سبد و ادامه</button>
          </Form>
        </section>
      ) : null}

      {session.status === "forbidden" ? (
        <StatePanel
          variant="forbidden"
          title="ادامه تسویه‌حساب مجاز نیست"
          message="نشست فعلی اجازه ادامه این مسیر را ندارد."
          requestId={session.requestId}
          urgent
        />
      ) : null}

      {session.status === "recovery" && !otpMode ? (
        <StatePanel
          variant="recovery"
          title="وضعیت نشست قطعی نیست"
          message="می‌توانید با کد یک‌بارمصرف دوباره هویت خود را تأیید کنید."
          requestId={session.requestId}
        />
      ) : null}

      {session.status !== "authenticated" && session.status !== "forbidden" && !otpMode ? (
        <section className="checkout-identity__card" aria-labelledby="identity-mobile-title">
          <h2 id="identity-mobile-title">دریافت کد ورود</h2>
          <p>شماره موبایل خود را وارد کنید. سفارش یا پرداخت در این مرحله ساخته نمی‌شود.</p>
          <Form method="post" className="checkout-identity__form">
            <input type="hidden" name="intent" value="request-otp" />
            <label htmlFor="checkout-mobile">شماره موبایل</label>
            <input
              id="checkout-mobile"
              name="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09123456789"
              dir="ltr"
              required
              minLength={10}
              maxLength={14}
              disabled={busy}
            />
            <button type="submit" disabled={busy}>دریافت کد ورود</button>
          </Form>
        </section>
      ) : null}

      {otpMode && challengeId ? (
        <section className="checkout-identity__card" aria-labelledby="identity-code-title">
          <h2 id="identity-code-title">تأیید کد یک‌بارمصرف</h2>
          <p>کد شش‌رقمی ارسال‌شده را وارد کنید. کد در URL یا گزارش‌ها قرار نمی‌گیرد.</p>
          <Form method="post" className="checkout-identity__form">
            <input type="hidden" name="intent" value="verify-otp" />
            <input type="hidden" name="challenge_id" value={challengeId} />
            <label htmlFor="checkout-otp">کد ورود</label>
            <input
              id="checkout-otp"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              dir="ltr"
              required
              disabled={busy}
            />
            <button type="submit" disabled={busy}>تأیید هویت و ادامه</button>
          </Form>
          <Form method="post" className="checkout-identity__secondary-form">
            <input type="hidden" name="intent" value="request-otp" />
            <label htmlFor="checkout-mobile-again">کد تازه می‌خواهید؟ شماره موبایل را دوباره وارد کنید.</label>
            <div className="checkout-identity__inline">
              <input
                id="checkout-mobile-again"
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="09123456789"
                dir="ltr"
                required
                disabled={busy}
              />
              <button type="submit" disabled={busy}>درخواست کد تازه</button>
            </div>
          </Form>
        </section>
      ) : null}

      {actionData?.status === "merge-conflict" ? (
        <p className="checkout-identity__conflict"><Link to="/cart">بازگشت به سبد و بازبینی</Link></p>
      ) : null}

      <nav className="checkout-identity__nav" aria-label="مسیر تسویه‌حساب">
        <Link to="/cart">بازگشت به سبد خرید</Link>
      </nav>

      {busy ? <p className="checkout-identity__busy" role="status" aria-live="polite">در حال بررسی authoritative…</p> : null}
    </div>
  );
}
