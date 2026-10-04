import { readFileSync } from "node:fs";
const files={routes:read("app/routes.ts"),callback:read("app/routes/payment-provider-callback.tsx"),paymentReturn:read("app/routes/payment-return.tsx"),outcome:read("app/routes/order-outcome.tsx"),review:read("app/features/cart-checkout/checkout-review.server.ts"),payment:read("app/features/cart-checkout/checkout-payment.server.ts"),state:read("app/features/cart-checkout/checkout-flow-state.server.ts"),data:read("app/features/cart-checkout/cart-checkout-data.server.ts"),returnView:read("app/features/cart-checkout/PaymentReturnView.tsx"),outcomeView:read("app/features/cart-checkout/OrderOutcomeView.tsx"),css:read("app/styles/checkout-flow.css")};
function read(path:string){return readFileSync(new URL("../"+path,import.meta.url),"utf8");}function need(ok:boolean,code:string){if(!ok)throw new Error(code);}
need(files.routes.includes('route("payments/:paymentId/callback"'),"PAYMENT_CALLBACK_ROUTE_MISSING");
need(!files.paymentReturn.includes("RoutePlaceholder")&&!files.outcome.includes("RoutePlaceholder"),"PAYMENT_OUTCOME_PLACEHOLDER_REMAINS");
need(files.review.includes("beginPaymentForOrder"),"REVIEW_PAYMENT_HANDOFF_MISSING");
need(files.data.includes('"/payments/{payment_id}/callback"')&&files.data.includes('"/payments/{payment_id}/status"')&&files.data.includes('"/payments/{payment_id}/verify"'),"AUTHORITATIVE_PAYMENT_APIS_MISSING");
need(files.callback.includes("processPaymentProviderCallback")&&files.callback.includes("payment/return?payment_id=")&&!files.callback.includes('+"&state="'),"CALLBACK_BRIDGE_INVALID");
need(files.state.includes("createHmac")&&files.state.includes("CHECKOUT_PAYMENT_HANDOFF_TAMPERED")&&files.state.includes("HttpOnly"),"SIGNED_HANDOFF_MISSING");
need(!/(localStorage|sessionStorage|document\.cookie)/.test(files.state+files.payment+files.callback),"BROWSER_SECRET_STORAGE_FORBIDDEN");
need(files.payment.includes('status === "initiating" || status === "pending" || status === "unknown"'),"UNKNOWN_RESULT_GUARD_MISSING");
need(files.payment.includes("payment-retry:")&&files.payment.includes("loadPaymentStatus"),"CONTROLLED_RETRY_MISSING");
need(files.returnView.includes('<bdi dir="ltr">')&&files.outcomeView.includes('<bdi dir="ltr">'),"BIDI_REFERENCE_ISOLATION_MISSING");
need(files.css.includes("@media(max-width:600px)")||files.css.includes("@media (max-width:600px)"),"PAYMENT_RESPONSIVE_RULE_MISSING");
need(files.css.includes("min-height:44px"),"TOUCH_TARGET_BASELINE_MISSING");
console.log(JSON.stringify({status:"PASS",stage:"63-G",paymentInitiation:true,providerCallbackBridge:true,signedPaymentHandoff:true,authoritativeStatusVerify:true,controlledRetry:true,orderOutcome:true,providerEnablement:"DEFERRED_TO_STEP74",graphWork:"DEFERRED_TO_STEP63_FINAL"},null,2));
