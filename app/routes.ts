import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("healthcheck", "routes/healthcheck.tsx"),
  route("join", "routes/join.tsx"),
  route("login", "routes/login.tsx"),
  route("magic_link", "routes/magic_link.tsx"),
  route("logout", "routes/logout.tsx"),
  route("notes", "routes/notes.tsx", [
    index("routes/notes._index.tsx"),
    route("new", "routes/notes.new.tsx"),
    route(":noteId", "routes/notes.$noteId.tsx"),
  ]),
] satisfies RouteConfig;