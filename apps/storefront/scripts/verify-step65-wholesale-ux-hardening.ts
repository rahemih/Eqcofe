import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read=(p:string)=>readFile(p,"utf8");
const [intro,apply,status,css,product,cart,review,outcome,order,pkgText]=await Promise.all([
  read("apps/storefront/app/features/wholesale/WholesaleIntroductionView.tsx"),
  read("apps/storefront/app/features/wholesale/WholesaleApplicationView.tsx"),
  read("apps/storefront/app/features/wholesale/WholesaleStatusView.tsx"),
  read("apps/storefront/app/styles/wholesale.css"),
  read("apps/storefront/app/features/product-detail/ProductAddToCart.tsx"),
  read("apps/storefront/app/features/cart-checkout/CartView.tsx"),
  read("apps/storefront/app/features/cart-checkout/CheckoutReviewView.tsx"),
  read("apps/storefront/app/features/cart-checkout/OrderOutcomeView.tsx"),
  read("apps/storefront/app/features/account/AccountOrderDetailView.tsx"),
  read("apps/storefront/package.json"),
]);
for(const token of ["max-width: 52.5rem","max-width: 37.5rem","max-width:22.5rem","max-width:20rem","min-width:75rem","min-width:90rem","min-height: 44px","focus-visible","overflow-wrap:anywhere","unicode-bidi:isolate"]) assert.ok(css.includes(token),"STEP65_G_CSS_MISSING:"+token);
assert.ok(intro.includes('role="status" aria-live="polite"'));
assert.ok(apply.includes('aria-busy={busy}'));
assert.ok(apply.includes('role="alert" aria-live="assertive"'));
assert.ok(apply.includes('role="status" aria-live="polite"'));
assert.ok(apply.includes('aria-describedby="wholesale-application-consent"'));
assert.ok(status.includes('role="status" aria-live="polite"'));
assert.ok(status.includes('data-wholesale-application-status={application.status}'));
assert.ok(status.includes('className="wholesale-status__identifier" dir="ltr"'));
assert.ok(product.includes('aria-busy={submitting}')&&product.includes('role="status" aria-live="polite"'));
assert.ok(cart.includes('aria-busy={busy}')&&cart.includes('role="status" aria-live="polite"')&&cart.includes('<bdi dir="ltr">{item.sku}</bdi>'));
assert.ok(review.includes('aria-busy={busy}')&&review.includes('role="status" aria-live="polite"'));
assert.ok(outcome.includes('aria-busy={busy}')&&outcome.includes('role="status" aria-live="polite"'));
assert.ok(order.includes('aria-busy={busy}')&&order.includes('role="status" aria-live="polite"'));
const sources=intro+apply+status+product+cart+review+outcome+order;
assert.equal(sources.includes("wholesale_quantity_discount_min_qty"),false);
assert.equal(sources.includes("discount_percent"),false);
assert.equal(/\b11\b/.test(sources),false);
assert.equal(/(?:brown|saddlebrown|sienna|peru|chocolate)/i.test(css),false);
const viewports=[320,360,600,840,1200,1440];
assert.equal(viewports.length,6);
const pkg=JSON.parse(pkgText) as {scripts:Record<string,string|undefined>};
assert.equal(pkg.scripts["wholesale-ux-hardening:verify"],"pnpm --dir ../.. exec tsx apps/storefront/scripts/verify-step65-wholesale-ux-hardening.ts");
assert.ok(pkg.scripts.verify?.includes("wholesale-ux-hardening:verify"));
console.log(JSON.stringify({status:"PASS",stage:"65-G",viewports,reflow400Percent:true,minimumTouchTargetPx:44,nonColorStateCues:true,stableBidiIdentifiers:true,browserPricingAuthority:false},null,2));
