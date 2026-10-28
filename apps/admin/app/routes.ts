import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("login", "./routes/login.tsx"),
  route("logout", "./routes/logout.ts"),
  layout("./routes/authenticated.tsx", [
    index("./routes/foundation.tsx"),
    route("security-keys", "./routes/security-keys.tsx"),
    route("catalog/products", "./routes/catalog-products.tsx"),
    route("catalog/products/new", "./routes/catalog-product-new.tsx"),
    route("catalog/media", "./routes/catalog-media.tsx"),
    route("catalog/sales-control", "./routes/catalog-sales-control.tsx"),
    route("catalog/products/:productId/attributes", "./routes/catalog-product-attributes.tsx"),
    route("catalog/products/:productId/media", "./routes/catalog-product-media.tsx"),
    route("catalog/products/:productId", "./routes/catalog-product.tsx"),
    route("catalog/structure/:kind", "./routes/catalog-structure.tsx"),
    route("pricing/base-prices", "./routes/pricing-base-prices.tsx"),
    route("pricing/rules", "./routes/pricing-rules.tsx"),
    route("pricing/bulk", "./routes/pricing-bulk.tsx"),
    route("pricing/fx", "./routes/pricing-fx.tsx"),
    route("pricing/currency-rules", "./routes/pricing-currency-rules.tsx"),
    route("excel/:kind", "./routes/excel.tsx"),
    route("inventory/:view", "./routes/inventory.tsx"),
    route("inventory-flows/:view", "./routes/inventory-flows.tsx"),
    route("procurement/:view", "./routes/procurement.tsx"),
    route("destinations/:surfaceId", "./routes/destination.tsx"),
  ]),
] satisfies RouteConfig;
