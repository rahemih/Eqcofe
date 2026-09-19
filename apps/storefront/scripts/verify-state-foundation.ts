import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiClientError } from "../app/platform/api/errors.js";
import {
  connectivityHintFromOnlineFlag,
} from "../app/platform/state/connectivity.js";
import { toPublicProblem } from "../app/platform/state/problem.js";
import { planRecovery } from "../app/platform/state/recovery-policy.js";
import {
  classifyApiFailureState,
  emptyState,
  loadingState,
  readyState,
} from "../app/platform/state/surface-state.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const repoRoot = resolve(storefrontRoot, "../..");

const recoverySource = readFileSync(
  resolve(storefrontRoot, "app/platform/state/recovery-policy.ts"),
  "utf8",
);
const stateCss = readFileSync(resolve(storefrontRoot, "app/styles/state.css"), "utf8");
const statePanelSource = readFileSync(
  resolve(storefrontRoot, "app/components/StatePanel.tsx"),
  "utf8",
);
const i18nSource = readFileSync(resolve(storefrontRoot, "app/i18n/fa-IR.ts"), "utf8");
const rootSource = readFileSync(resolve(storefrontRoot, "app/root.tsx"), "utf8");
const wireframe = JSON.parse(
  readFileSync(
    resolve(repoRoot, "docs/13-product-design/step55-storefront-wireframe-contract.json"),
    "utf8",
  ),
) as {
  stateCoverage: {
    families: Record<string, string[]>;
  };
};

assert.equal(rootSource.includes('import "./styles/state.css";'), true);
assert.equal(recoverySource.includes("setTimeout"), false, "FOUNDATION_MUST_NOT_AUTO_RETRY");
assert.equal(recoverySource.includes("setInterval"), false, "FOUNDATION_MUST_NOT_POLL");
assert.match(stateCss, /min-block-size:\s*var\(--eq-size-touch-min\)/);
assert.match(stateCss, /min-inline-size:\s*var\(--eq-size-touch-min\)/);
assert.match(stateCss, /border-inline-start/);
assert.equal(/\b(left|right)\s*:/.test(stateCss), false, "STATE_CSS_MUST_USE_LOGICAL_PROPERTIES");

assert.deepEqual(connectivityHintFromOnlineFlag(undefined), "unknown");
assert.deepEqual(connectivityHintFromOnlineFlag(true), "online");
assert.deepEqual(connectivityHintFromOnlineFlag(false), "offline");

assert.deepEqual(loadingState("initial"), { status: "loading", mode: "initial" });
assert.deepEqual(loadingState("refresh", { items: [1] }), {
  status: "loading",
  mode: "refresh",
  previous: { items: [1] },
});
assert.deepEqual(readyState({ id: 1 }), { status: "ready", data: { id: 1 } });
assert.deepEqual(emptyState("first-use"), { status: "empty", reason: "first-use" });
assert.deepEqual(emptyState("filtered"), { status: "empty", reason: "filtered" });
assert.deepEqual(emptyState("no-result"), { status: "empty", reason: "no-result" });

const networkError = new ApiClientError({
  kind: "network",
  code: "NETWORK_ERROR",
  message: "secret backend transport detail",
  retryable: true,
});
const publicProblem = toPublicProblem(networkError);
assert.deepEqual(publicProblem, {
  kind: "network",
  requestId: null,
  status: null,
  retryable: true,
});
assert.equal("message" in publicProblem, false, "RAW_ERROR_MESSAGE_MUST_NOT_REACH_UI_PROBLEM");

assert.deepEqual(
  planRecovery({
    method: "get",
    error: networkError,
    connectivity: "online",
  }),
  {
    action: "retry-read",
    automatic: false,
    reason: "safe-read-retry",
  },
);

assert.deepEqual(
  planRecovery({
    method: "post",
    error: networkError,
    connectivity: "online",
  }),
  {
    action: "none",
    automatic: false,
    reason: "not-retryable",
  },
);

assert.deepEqual(
  planRecovery({
    method: "post",
    error: networkError,
    connectivity: "online",
    unknownResult: true,
    authoritativeStatusCheckAvailable: true,
  }),
  {
    action: "check-authoritative-status",
    automatic: false,
    reason: "unknown-mutation-result",
  },
);

assert.deepEqual(
  planRecovery({
    method: "get",
    error: networkError,
    connectivity: "offline",
  }),
  {
    action: "wait-for-network",
    automatic: false,
    reason: "offline-hint",
  },
);

const forbiddenError = new ApiClientError({
  kind: "http",
  code: "FORBIDDEN",
  message: "forbidden",
  status: 403,
  requestId: "req-forbidden",
});
assert.deepEqual(
  classifyApiFailureState(forbiddenError, {
    method: "get",
    connectivity: "online",
  }),
  {
    status: "forbidden",
    requestId: "req-forbidden",
  },
);

assert.deepEqual(
  classifyApiFailureState(networkError, {
    method: "get",
    connectivity: "offline",
    previous: { items: [1, 2] },
  }),
  {
    status: "offline",
    connectivity: "offline",
    previous: { items: [1, 2] },
  },
);

const recoveryState = classifyApiFailureState(networkError, {
  method: "get",
  connectivity: "online",
});
assert.equal(recoveryState.status, "recovery");
if (recoveryState.status === "recovery") {
  assert.equal(recoveryState.plan.action, "retry-read");
  assert.equal(recoveryState.plan.automatic, false);
}

const mutationFailure = classifyApiFailureState(networkError, {
  method: "post",
  connectivity: "online",
});
assert.equal(mutationFailure.status, "error");

assert.match(statePanelSource, /role=\{role\}/);
assert.match(statePanelSource, /aria-live=\{urgent \? "assertive" : "polite"\}/);
assert.match(statePanelSource, /aria-busy=\{variant === "loading" \? true : undefined\}/);
assert.equal(statePanelSource.includes('<bdi dir="ltr">{requestId}</bdi>'), true);
assert.match(statePanelSource, /\{action \? \(/);
assert.match(i18nSource, /در حال به‌روزرسانی/);
assert.match(i18nSource, /دسترسی به این بخش مجاز نیست/);
assert.match(i18nSource, /اتصال شبکه در دسترس نیست/);
assert.match(i18nSource, /با این فیلتر موردی پیدا نشد/);

assert.deepEqual(wireframe.stateCoverage.families.load, ["initial", "progressive", "refresh"]);
assert.deepEqual(wireframe.stateCoverage.families.empty, ["first-use", "filtered", "no-result"]);
const providerStates = wireframe.stateCoverage.families.provider ?? [];
const accessStates = wireframe.stateCoverage.families.access ?? [];
assert.equal(providerStates.includes("offline"), true);
assert.equal(providerStates.includes("timeout"), true);
assert.equal(providerStates.includes("unknown-result"), true);
assert.equal(accessStates.includes("denied"), true);

console.log(JSON.stringify({
  status: "PASS",
  stage: "58-F",
  foundation: {
    loadingModes: ["initial", "progressive", "refresh"],
    emptyReasons: ["first-use", "filtered", "no-result"],
    surfaceStates: ["loading", "ready", "empty", "error", "forbidden", "offline", "recovery"],
    connectivity: "browser-hint-not-authority",
    automaticRecovery: false,
  },
  verified: {
    previousContextPreserved: true,
    rawErrorMessageHidden: true,
    safeReadManualRetryOnly: true,
    mutationAutomaticRetryDisabled: true,
    unknownMutationRequiresAuthoritativeStatusCapability: true,
    offlineHintDistinct: true,
    forbiddenDistinct: true,
    accessibleStatusMarkup: true,
    requestIdBidiIsolation: true,
    touchTargetMinimum: true,
    logicalRtlCss: true,
    step55StateVocabularyTraced: true,
  },
}, null, 2));
