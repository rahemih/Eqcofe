import type { ReactNode } from "react";
import { Link } from "react-router";
import { StatePanel } from "../../components/StatePanel.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { CompareResponse } from "./compare-wishlist-contract.js";
import type { CompareQueryIssue } from "./compare-route-data.server.js";

export function CompareState({
  state,
  issue,
  retryHref,
}: {
  state: AsyncSurfaceState<CompareResponse>;
  issue: CompareQueryIssue | null;
  retryHref: string;
}) {
  if (issue) {
    return (
      <CompareStateWithAction
        panel={(
          <StatePanel
            variant="error"
            urgent
            title="نشانی مقایسه معتبر نیست"
            message={queryIssueMessage(issue.code)}
          />
        )}
        href="/compare"
        label="پاک کردن نشانی و شروع دوباره"
      />
    );
  }

  if (state.status === "ready") return null;
  if (state.status === "empty") {
    return (
      <StatePanel
        variant="empty"
        emptyReason="first-use"
        title="هنوز محصول کافی برای مقایسه انتخاب نشده است"
        message="از یک دسته حداقل دو و حداکثر چهار محصول را برای مقایسه انتخاب کنید."
      />
    );
  }
  if (state.status === "forbidden") {
    return <StatePanel variant="forbidden" requestId={state.requestId} />;
  }
  if (state.status === "offline") {
    return (
      <CompareStateWithAction
        panel={<StatePanel variant="offline" />}
        href={retryHref}
        label="تلاش دوباره"
        reloadDocument
      />
    );
  }
  if (state.status === "recovery") {
    return (
      <CompareStateWithAction
        panel={(
          <StatePanel
            variant="recovery"
            requestId={state.problem.requestId}
            title="مقایسه در این لحظه کامل نشد"
            message="انتخاب‌های شما حفظ شده‌اند؛ دوباره همین نشانی را باز کنید."
          />
        )}
        href={retryHref}
        label="تلاش دوباره با همین انتخاب‌ها"
        reloadDocument
      />
    );
  }
  if (state.status === "loading") {
    return <StatePanel variant="loading" loadingMode={state.mode} />;
  }

  return (
    <CompareStateWithAction
      panel={(
        <StatePanel
          variant="error"
          urgent
          requestId={state.problem.requestId}
          title="محصول‌های انتخاب‌شده قابل مقایسه نیستند"
          message="محدودیت سازگاری را سرور تعیین می‌کند. انتخاب‌ها را اصلاح کنید یا یک مقایسه تازه بسازید."
        />
      )}
      href="/compare"
      label="شروع مقایسه تازه"
    />
  );
}

function CompareStateWithAction({
  panel,
  href,
  label,
  reloadDocument = false,
}: {
  panel: ReactNode;
  href: string;
  label: string;
  reloadDocument?: boolean;
}) {
  return (
    <div className="compare-state-action">
      {panel}
      <Link
        className="compare-state-action__link"
        to={href}
        reloadDocument={reloadDocument}
      >
        {label}
      </Link>
    </div>
  );
}

function queryIssueMessage(code: CompareQueryIssue["code"]): string {
  return {
    COMPARE_QUERY_KEY_UNSUPPORTED: "پارامتر ناشناخته در نشانی مقایسه وجود دارد.",
    COMPARE_PRODUCT_ID_INVALID: "شناسه یکی از محصولات معتبر نیست.",
    COMPARE_PRODUCT_DUPLICATE: "یک محصول بیش از یک‌بار در مقایسه تکرار شده است.",
    COMPARE_PRODUCT_LIMIT_EXCEEDED: "حداکثر چهار محصول را می‌توان هم‌زمان مقایسه کرد.",
  }[code];
}
