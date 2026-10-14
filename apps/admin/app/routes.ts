import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("login", "./routes/login.tsx"),
  route("logout", "./routes/logout.ts"),
  layout("./routes/authenticated.tsx", [
    index("./routes/foundation.tsx"),
    route("security-keys", "./routes/security-keys.tsx"),
    route("destinations/:surfaceId", "./routes/destination.tsx"),
  ]),
] satisfies RouteConfig;
