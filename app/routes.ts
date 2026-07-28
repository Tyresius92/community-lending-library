import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("healthcheck", "routes/healthcheck/healthcheck.tsx"),
  route("join", "routes/join/join.tsx"),
  route("login", "routes/login/login.tsx"),
  route("magic_link", "routes/magic_link/magic_link.tsx"),
  route("logout", "routes/logout/logout.tsx"),
  route("notes", "routes/notes/notes.layout.tsx", [
    index("routes/notes/notes.tsx"),
    route("new", "routes/notes/new/new.tsx"),
    route(":noteId", "routes/notes/$noteId/$noteId.tsx"),
  ]),
] satisfies RouteConfig;
