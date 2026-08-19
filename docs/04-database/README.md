# Database

EQCOFE uses PostgreSQL and ordered SQL migrations under `database/migrations/`.

The canonical import contains migrations `0001` through `0033`, spanning schemas/platform, identity/admin, catalog, pricing, inventory, procurement, cart/checkout/orders, payments, fulfillment, after-sales, finance, customer, central configuration and notifications.

Migration history must not be rewritten merely for cosmetic reasons. Test new migrations on an isolated PostgreSQL branch/environment before production application.
