# STEP 33 — Catalog Core

Implemented Product, Variant, Brand, Category, Attribute/AttributeValue, product and variant attribute assignments, Media lifecycle/attachment/order, comparison, category filters, sales-control hierarchy, Catalog SQL migrations, OpenAPI routes and domain tests.

Pricing and inventory are intentionally represented as deferred/null read fields until their owning modules are implemented in later steps. Sellable product publication is guarded by the PricingEligibilityPort.
