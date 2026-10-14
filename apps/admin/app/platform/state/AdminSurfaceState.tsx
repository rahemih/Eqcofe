import { useId } from "react";
import { ADMIN_SURFACE_STATE_COPY, type AdminSurfaceStateKind } from "./admin-surface-state";

type StateAction = {
  href: string;
  label: string;
};

type AdminSurfaceStateProps = {
  kind: AdminSurfaceStateKind;
  title?: string;
  description?: string;
  requestId?: string | null;
  action?: StateAction;
  compact?: boolean;
};

export function AdminSurfaceState({
  kind,
  title,
  description,
  requestId,
  action,
  compact = false,
}: AdminSurfaceStateProps) {
  const headingId = useId();
  const copy = ADMIN_SURFACE_STATE_COPY[kind];
  const role = kind === "error" ? "alert" : "status";

  return (
    <section
      className={"admin-surface-state admin-surface-state-" + kind + (compact ? " admin-surface-state-compact" : "")}
      role={role}
      aria-labelledby={headingId}
      aria-busy={kind === "loading" ? true : undefined}
      data-admin-state={kind}
    >
      <p className="admin-state-kicker">{copy.kicker}</p>
      <h2 id={headingId}>{title ?? copy.title}</h2>
      <p>{description ?? copy.description}</p>
      {kind === "loading" ? (
        <div className="admin-loading-structure" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {requestId ? <p className="admin-state-request">شناسه پیگیری: <bdi>{requestId}</bdi></p> : null}
      {action ? <a className="admin-state-action" href={action.href}>{action.label}</a> : null}
    </section>
  );
}
