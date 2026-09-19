import { faIR } from "../i18n/fa-IR.js";
import type { EmptyReason, LoadingMode } from "../platform/state/surface-state.js";

export type StatePanelVariant =
  | "loading"
  | "empty"
  | "error"
  | "forbidden"
  | "offline"
  | "recovery";

export type StatePanelAction = {
  label: string;
  onAction: () => void;
};

export type StatePanelProps = {
  variant: StatePanelVariant;
  loadingMode?: LoadingMode;
  emptyReason?: EmptyReason;
  title?: string;
  message?: string;
  requestId?: string | null;
  action?: StatePanelAction;
  urgent?: boolean;
};

export function StatePanel({
  variant,
  loadingMode = "initial",
  emptyReason = "no-result",
  title,
  message,
  requestId,
  action,
  urgent = false,
}: StatePanelProps) {
  const fallback = getFallbackCopy(variant, loadingMode, emptyReason);
  const role = urgent ? "alert" : "status";

  return (
    <section
      className="state-panel"
      data-state={variant}
      role={role}
      aria-live={urgent ? "assertive" : "polite"}
      aria-busy={variant === "loading" ? true : undefined}
    >
      <h2 className="state-panel__title">{title ?? fallback.title}</h2>
      <p className="state-panel__message">{message ?? fallback.message}</p>

      {requestId ? (
        <p className="state-panel__request-id">
          <span>{faIR.state.requestIdLabel}: </span>
          <bdi dir="ltr">{requestId}</bdi>
        </p>
      ) : null}

      {action ? (
        <div className="state-panel__actions">
          <button type="button" onClick={action.onAction}>
            {action.label}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function getFallbackCopy(
  variant: StatePanelVariant,
  loadingMode: LoadingMode,
  emptyReason: EmptyReason,
): { title: string; message: string } {
  if (variant === "loading") {
    if (loadingMode === "refresh") {
      return {
        title: faIR.state.loading.refreshTitle,
        message: faIR.state.loading.refreshBody,
      };
    }
    if (loadingMode === "progressive") {
      return {
        title: faIR.state.loading.progressiveTitle,
        message: faIR.state.loading.progressiveBody,
      };
    }
    return {
      title: faIR.state.loading.initialTitle,
      message: faIR.state.loading.initialBody,
    };
  }

  if (variant === "empty") {
    if (emptyReason === "first-use") {
      return {
        title: faIR.state.empty.firstUseTitle,
        message: faIR.state.empty.firstUseBody,
      };
    }
    if (emptyReason === "filtered") {
      return {
        title: faIR.state.empty.filteredTitle,
        message: faIR.state.empty.filteredBody,
      };
    }
    return {
      title: faIR.state.empty.noResultTitle,
      message: faIR.state.empty.noResultBody,
    };
  }

  return {
    error: {
      title: faIR.state.error.title,
      message: faIR.state.error.body,
    },
    forbidden: {
      title: faIR.state.forbidden.title,
      message: faIR.state.forbidden.body,
    },
    offline: {
      title: faIR.state.offline.title,
      message: faIR.state.offline.body,
    },
    recovery: {
      title: faIR.state.recovery.title,
      message: faIR.state.recovery.body,
    },
  }[variant];
}
